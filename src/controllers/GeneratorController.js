/**
 * GeneratorController
 * Orquestador principal para la generación de prompts e imágenes.
 * Integración de Generación de Imágenes.
 */

import { Storage } from "@google-cloud/storage";
import { VertexAI } from "@google-cloud/vertexai";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import path from "path";

import CampaignAsset from "../model/CampaignAsset.model.js";
import ValidationService, { ValidationError } from '../services/ValidationService.js';
import PromptBuilder from '../services/PromptBuilder.js';
import VectorCore from '../services/VectorCore.js';
import { brand_manual_vectors } from '../services/QuerySearchServise.js';
import { ERROR_CODES } from '../services/promptConstants.js';
import GeminiService from '../services/GeminiService.js';
import { count } from "console";

// --- CONFIGURACIÓN DE CLIENTES (GCP & VERTEX) ---
const PROJECT_ID = process.env.GCP_PROJECT_ID || process.env.GOOGLE_PROJECT_ID;
const LOCATION = "us-central1";
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || "creativa-campaign-assets";
const MODEL_NAME = 'gemini-2.5-flash-image';

const storage = new Storage({ projectId: PROJECT_ID });
const bucket = storage.bucket(BUCKET_NAME);

// VERTEX AI
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const generativeModel = vertexAI.preview.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.5,
        responseModalities: ['IMAGE', 'TEXT']
    },
});

class GeneratorController {
    /**
     * CONSTRUCTOR DE PROMPTS
     */
    async buildPrompt(req, res) {
        const startTime = Date.now();
        const requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            // PASO 1: Validación
            console.log(`[GeneratorController:${requestId}] Iniciando buildPrompt.`);

            const validatedData = ValidationService.validateRequest(req.body, req.user);
            const { brief, style, dimensions, variations, brandId } = validatedData;

            console.log(`[GeneratorController:${requestId}] Validado. Brief len: ${brief.length}`);

            // PASO 1.5: Mejora del Brief con IA
            console.log(`[GeneratorController:${requestId}] Mejorando brief con Gemini...`);

            // Llamada al nuevo servicio
            const enhancedBrief = await GeminiService.enhanceBrief(brief, style);

            // Log para ver la diferencia (útil en dev)
            console.log(`[GeneratorController:${requestId}] Brief Original: "${brief}"`);
            console.log(`[GeneratorController:${requestId}] Brief Mejorado: "${enhancedBrief.substring(0, 50)}..."`);

            // PASO 2: Obtención de Contexto (RAG)
            console.log(`[GeneratorController:${requestId}] Buscando contexto RAG...`);
            const context = await this.getContextWithFallback(brandId, enhancedBrief, requestId);

            // PASO 3: Construcción del Prompt
            const optimizedPrompt = PromptBuilder.build({
                brief: enhancedBrief, // Usamos el mejorado aquí
                context,
                style,
                dimensions
            });

            // PASO 4: Respuesta
            const duration = Date.now() - startTime;

            res.statusCode = 200;
            return res.json({
                success: true,
                data: {
                    prompt: optimizedPrompt,
                    metadata: {
                        requestId,
                        contextSource: context.source,
                        relevanceScore: context.relevanceScore || 0,
                        originalBriefLength: brief.length,
                        enhancedBriefLength: enhancedBrief.length, // Métrica interesante
                        params: { style, dimensions, variations },
                        processingTime: duration,
                        timestamp: new Date().toISOString()
                    }
                }
            });

        } catch (error) {
            // ... (Mismo manejo de errores existente)
            console.error(`[GeneratorController:${requestId}] Error:`, error);
            if (error instanceof ValidationError) {
                res.statusCode = error.statusCode;
                return res.json({ success: false, error: { code: error.code, message: error.message } });
            }
            res.statusCode = 500;
            return res.json({ success: false, error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal Error' } });
        }
    }

    /**
     * Generación de Imágenes + Persistencia
     * POST /generator/generate-images
     */
    async generateImages(req, res) {
        const startTime = Date.now();
        const requestId = `img_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            console.log(`[GeneratorController:${requestId}] Iniciando generateImages con ${MODEL_NAME}.`);

            // 1. Validar inputs
            const validatedData = ValidationService.validateImageGenerationRequest(req.body);
            const { prompt, aspectRatio, sampleCount, campaignId } = validatedData;

            console.log(`[GeneratorController:${requestId}] Params: ${aspectRatio}, Count: ${sampleCount}, CampignID:${campaignId}`);

            // Fallback si no viene campaignId
            const activeCampaignId = campaignId || "unsorted-assets";

            // 2. Preparar Request a Vertex AI (SDK)
            // Agregamos el prompt al contenido
            const reqContent = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            };

            // 3. Generar
            console.log(`[GeneratorController:${requestId}] Enviando prompt a Gemini...`);

            const result = await generativeModel.generateContent(reqContent);
            const response = await result.response;
            const candidates = response.candidates || [];

            if (candidates.length === 0) {
                throw new Error("Gemini no devolvió candidatos.");
            }

            // 4. Procesar y Guardar Imágenes
            const processedAssets = [];

            for (const candidate of candidates) {
                const parts = candidate.content.parts || [];
                const imagePart = parts.find(p => p.inlineData);

                if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
                    console.log(`[GeneratorController:${requestId}] Imagen recibida (Base64). Procesando...`);

                    const buffer = Buffer.from(imagePart.inlineData.data, 'base64');

                    const savedAsset = await this._processAndSaveImage({
                        buffer,
                        campaignId: activeCampaignId,
                        prompt
                    });

                    processedAssets.push(savedAsset);
                }
            }

            const duration = Date.now() - startTime;
            console.log(`[GeneratorController:${requestId}] Finalizado. ${processedAssets.length} imágenes guardadas.`);


            if (processedAssets.length === 0) {
                throw new Error("Gemini respondió pero no generó datos de imagen válidos (posible filtro de seguridad).");
            }

            // 5. Respuesta con URLs reales
            res.statusCode = 200;
            return res.json({
                success: true,
                data: {
                    assets: processedAssets,
                    metadata: {
                        requestId,
                        count: processedAssets.length,
                        model: MODEL_NAME,
                        processingTime: duration
                    }
                }
            });

        } catch (error) {
            this._handleError(res, error, requestId);
        }
    }

    /**
     * [NUEVO] Helper Privado: Procesa Buffer, sube a GCS y guarda en Supabase
     */
    async _processAndSaveImage({ buffer, campaignId, prompt, parentAssetId = null }) {
        // 1. Optimización con Sharp (Metadata y Thumbnail)
        const metadata = await sharp(buffer).metadata();
        const isJpg = metadata.format === 'jpeg' || metadata.format === 'jpg';
        const contentType = isJpg ? 'image/jpeg' : 'image/png';
        const ext = isJpg ? 'jpeg' : 'png';

        const fileUuid = uuidv4();
        const timestamp = Date.now();

        const fileNameOriginal = `campaigns/${campaignId}/${fileUuid}_${timestamp}.${ext}`;
        const fileNameThumb = `campaigns/${campaignId}/${fileUuid}_${timestamp}_thumb.${ext}`;

        // Generar Thumbnail
        const thumbBuffer = await sharp(buffer)
            .resize(300)
            .toFormat(ext, { quality: 80 })
            .toBuffer();

        // 2. Subir a Google Cloud Storage
        const fileOriginal = bucket.file(fileNameOriginal);
        const fileThumb = bucket.file(fileNameThumb);

        const uploadOptions = { metadata: { contentType }, contentType, resumable: false };

        await Promise.all([
            fileOriginal.save(buffer, uploadOptions),
            fileThumb.save(thumbBuffer, uploadOptions)
        ]);

        // 3. Construir URLs Públicas
        // Nota: Asegúrate que tu bucket tenga permisos públicos o usa SignedURLs si es privado.
        const urlOriginal = `https://storage.googleapis.com/${BUCKET_NAME}/${fileNameOriginal}`;
        const urlThumb = `https://storage.googleapis.com/${BUCKET_NAME}/${fileNameThumb}`;

        const assetJson = { url: urlOriginal, thumbnail: urlThumb };

        const finalCampaignId = (campaignId && campaignId !== 'unsorted-assets') ? campaignId : '00000000-0000-0000-0000-000000000000';

        // 4. Guardar en Base de Datos (Supabase)
        const assetData = {
            campaign_assets: finalCampaignId,
            img_url: assetJson,
            prompt_used: prompt || "",
            is_approved: true, // Auto-aprobado por defecto
            parent_asset_id: parentAssetId
        };

        // Si el campaignId es "unsorted", quizás quieras omitir el campo o manejarlo diferente
        // Aquí asumimos que CampaignAsset.create maneja la inserción
        const newAsset = await CampaignAsset.create(assetData);

        // Retornar objeto combinado
        return {
            ...assetData,
            id: newAsset?.id,
            // Si CampaignAsset.create no devuelve el objeto, al menos devolvemos assetData
        };
    }

    // ... (Métodos getContextWithFallback y getGenericBrandContext se mantienen igual)
    // Asegúrate de copiar el resto del código que ya tenías en GeneratorController
    // para los métodos auxiliares de RAG.

    async getContextWithFallback(brandId, brief, requestId) {
        try {
            // Lógica RAG existente (VectorCore + brand_manual_vectors)
            const embedding = await VectorCore.embed(brief);
            const results = await brand_manual_vectors.query()
                .vector(embedding)
                .limit(3)
                .where('brandId', brandId) // Asumiendo que tu modelo soporta filtro
                .get();

            // Lógica simple de score (simulada si tu DB no devuelve score directo)
            // Ajusta según lo que devuelva tu Dynamo/Pgvector
            if (results && results.length > 0) {
                return {
                    source: 'rag',
                    relevanceScore: 0.85, // Stub, ajustar con valor real
                    data: this.formatRagResults(results)
                };
            }

            return this.getGenericBrandContext(brandId);
        } catch (e) {
            console.warn(`[GeneratorController:${requestId}] RAG Error: ${e.message}`);
            return this.getGenericBrandContext(brandId);
        }
    }

    formatRagResults(results) {
        // Tu lógica de formateo existente
        return {
            guidelines: results.map(r => r.content).slice(0, 5)
        };
    }

    getGenericBrandContext(brandId) {
        // Tu lógica fallback existente
        return {
            source: 'fallback',
            relevanceScore: 0,
            data: {
                colors: { primary: '#000000', secondary: '#FFFFFF' },
                typography: { heading: 'Sans-serif', body: 'Sans-serif' },
                visualStyle: 'Professional',
                guidelines: ['Maintain brand consistency']
            }
        };
    }

    /**
     * Helper centralizado para manejo de errores
     */
    _handleError(res, error, requestId) {
        console.error(`[GeneratorController:${requestId}] Error:`, error.message);

        if (error instanceof ValidationError) {
            res.statusCode = error.statusCode;
            return res.json({ success: false, error: { code: error.code, message: error.message } });
        }

        if (error.message.includes("SAFETY_BLOCK") || error.message.includes("blocked")) {
            res.statusCode = 400;
            return res.json({
                success: false,
                error: { code: 'SAFETY_VIOLATION', message: "Imagen bloqueada por políticas de seguridad." }
            });
        }

        res.statusCode = 500;
        return res.json({ success: false, error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Error interno del servidor.' } });
    }
}


export default new GeneratorController();