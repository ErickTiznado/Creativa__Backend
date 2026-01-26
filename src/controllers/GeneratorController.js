import { Storage } from "@google-cloud/storage";
import { VertexAI } from "@google-cloud/vertexai";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import CampaignAsset from "../model/CampaignAsset.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEY_PATH = path.join(__dirname, "../../config/key/creativa-key.json");

const PROJECT_ID = process.env.GCP_PROJECT_ID || "ugb-creativamkt-484123";
const LOCATION = "us-central1";
const MODEL = 'gemini-2.5-flash-image';

// --- 3. INICIALIZAR CLIENTES ---

// A. Storage (Google Drive)
const storage = new Storage({
    keyFilename: KEY_PATH,
    projectId: PROJECT_ID
});
const bucketName = process.env.GCS_BUCKET_NAME || "creativa-campaign-assets";
const bucket = storage.bucket(bucketName);

// B. Vertex AI (Inteligencia Artificial)
const vertexAI = new VertexAI({
    project: PROJECT_ID,
    location: LOCATION,
    googleAuthOptions: { keyFile: KEY_PATH } // Mantenemos tu auth manual que ya funcionó
});

// INSTANCIAR MODELO CON LA CONFIGURACIÓN DE ERICK
// Usamos .preview y responseModalities para forzar imagen
const generativeModel = vertexAI.preview.getGenerativeModel({
    model: MODEL,
    generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.1,
        responseModalities: ['IMAGE', 'TEXT'] // <--- LA CLAVE MÁGICA
    },
});

// --- HELPER PRIVADO (Guardado en DB y Storage) ---
async function _processAndSaveImage({ buffer, campaignId, prompt, parentAssetId = null }) {
    const metadata = await sharp(buffer).metadata();
    const isJpg = metadata.format === 'jpeg' || metadata.format === 'jpg';
    const contentType = isJpg ? 'image/jpeg' : 'image/png';
    const ext = isJpg ? 'jpeg' : 'png';

    const fileUuid = uuidv4();
    const timestamp = Date.now();

    const fileNameOriginal = `campaigns/${campaignId}/${fileUuid}_${timestamp}.${ext}`;
    const fileNameThumb = `campaigns/${campaignId}/${fileUuid}_${timestamp}_thumb.${ext}`;

    const thumbBuffer = await sharp(buffer)
        .resize(300)
        .toFormat(ext, { quality: 80 })
        .toBuffer();

    const fileOriginal = bucket.file(fileNameOriginal);
    const fileThumb = bucket.file(fileNameThumb);

    const uploadOptions = { metadata: { contentType }, contentType, resumable: false };

    await Promise.all([
        fileOriginal.save(buffer, uploadOptions),
        fileThumb.save(thumbBuffer, uploadOptions)
    ]);

    const urlOriginal = `https://storage.googleapis.com/${bucketName}/${fileNameOriginal}`;
    const urlThumb = `https://storage.googleapis.com/${bucketName}/${fileNameThumb}`;

    const assetJson = { url: urlOriginal, thumbnail: urlThumb };

    const assetData = {
        campaign_assets: campaignId,
        img_url: assetJson,
        prompt_used: prompt || "",
        is_approved: true,
        parent_asset_id: parentAssetId
    };

    const newAsset = await CampaignAsset.create(assetData);
    return { ...assetData, id: newAsset?.id };
}

// --- ENDPOINT 1: SAVE (ESTÁNDAR ROBUSTO) ---
export const saveToStorage = async (req, res) => {
    try {
        const { campaignId, prompt } = req.body;

        if (!campaignId || !req.files) {
            res.statusCode = 400;
            return res.json({ error: "Faltan datos requeridos (campaignId o archivos)" });
        }

        // --- NORMALIZACIÓN DE ARCHIVOS ---
        // El objetivo: Tener SIEMPRE un array en 'filesArray', venga como venga.

        let filesArray = [];

        // 1. Prioridad: El estándar 'images'
        if (req.files.images) {
            // Si viene 1 archivo, req.files.images es un Objeto.
            // Si vienen 2+ archivos, req.files.images es un Array.
            // El truco .concat() arregla eso automáticamente.
            filesArray = filesArray.concat(req.files.images);
        }

        // 2. Fallback: El legacy 'image' (por si el frontend se equivoca)
        if (req.files.image) {
            filesArray = filesArray.concat(req.files.image);
        }

        // Si después de revisar todo, sigue vacío...
        if (filesArray.length === 0) {
            // Intento final: Agarrar cualquier archivo que venga en el body
            // (Útil si el frontend le puso nombres raros como 'fotoPortada', 'logo', etc.)
            Object.keys(req.files).forEach(key => {
                if (key !== 'images' && key !== 'image') {
                    filesArray = filesArray.concat(req.files[key]);
                }
            });
        }

        if (filesArray.length === 0) {
            res.statusCode = 400;
            return res.json({ error: "No se subió ningún archivo válido." });
        }

        console.log(`Recibidos ${filesArray.length} archivos para subir.`);

        // --- PROCESAMIENTO ---
        const uploadPromises = filesArray.map(async (file) => {
            return await _processAndSaveImage({
                buffer: file.data,
                campaignId,
                prompt
            });
        });

        const results = await Promise.all(uploadPromises);

        res.statusCode = 201;
        res.json({
            success: true,
            message: "Archivos subidos correctamente",
            count: results.length,
            data: results
        });

    } catch (error) {
        console.error("Error saveToStorage:", error);
        res.statusCode = 500;
        res.json({ error: error.message });
    }
};

// --- ENDPOINT 2: REFINAMIENTO MULTIMODAL (FUSIÓN DE IMÁGENES) ---
export const refineAsset = async (req, res) => {
    try {
        // AHORA ACEPTAMOS "assetIds" (ARRAY) EN LUGAR DE "assetId" (STRING)
        // Ejemplo body: { "assetIds": ["id_logo", "id_fuego"], "refinementPrompt": "Fusiona..." }
        let { assetIds, refinementPrompt } = req.body;

        // Compatibilidad hacia atrás: Si envían "assetId" (singular), lo convertimos en array
        if (req.body.assetId) {
            assetIds = [req.body.assetId];
        }

        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0 || !refinementPrompt) {
            res.statusCode = 400;
            return res.json({ error: "Faltan datos: assetIds (array) o refinementPrompt" });
        }

        // 1. Preparar las partes del mensaje para Gemini
        // La primera parte siempre es el texto (prompt)
        const parts = [
            { text: refinementPrompt }
        ];

        let campaignId = null; // Guardaremos el campaignId de la primera imagen para organizar

        console.log(`Procesando ${assetIds.length} imágenes para fusión...`);

        // 2. Bucle: Descargar y procesar CADA imagen del array
        for (const id of assetIds) {
            // A. Buscar en DB
            const assets = await CampaignAsset.where("id", id).get();
            const assetObj = assets && assets.length > 0 ? assets[0] : null;

            if (!assetObj) {
                console.warn(`⚠️ Asset ID ${id} no encontrado, saltando...`);
                continue;
            }

            // Guardamos el campaignId de la primera imagen encontrada
            if (!campaignId) campaignId = assetObj.campaign_assets;

            let imgUrl = assetObj.img_url;
            if (typeof imgUrl === 'object' && imgUrl.url) imgUrl = imgUrl.url;

            // B. Descargar Buffer
            const responseImg = await axios.get(imgUrl, { responseType: 'arraybuffer' });
            const baseImageBuffer = Buffer.from(responseImg.data);
            const base64Image = baseImageBuffer.toString('base64');
            const mimeType = imgUrl.endsWith('png') ? 'image/png' : 'image/jpeg';

            // C. Agregar al Payload de Gemini
            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Image
                }
            });
        }

        if (parts.length < 2) {
            // Si solo hay texto (parts[0]) y ninguna imagen válida
            return res.status(400).json({ error: "No se pudieron procesar las imágenes solicitadas." });
        }

        // 3. Preparar Request para Gemini
        const reqContent = {
            contents: [{
                role: 'user',
                parts: parts // Aquí va: [Texto, Imagen1, Imagen2, ...]
            }]
        };

        console.log(`Enviando a Gemini (${MODEL}) con ${parts.length - 1} imágenes...`);

        // 4. Generar
        const result = await generativeModel.generateContent(reqContent);
        const response = await result.response;

        // 5. Extraer y Guardar (Igual que antes)
        const candidate = response.candidates[0];
        const imageData = candidate.content.parts.find(part => part.inlineData);

        let textResponse = "";
        candidate.content.parts.forEach(part => { if (part.text) textResponse += part.text; });

        if (imageData) {
            console.log("¡Fusión Exitosa! Imagen generada.");
            const resultBuffer = Buffer.from(imageData.inlineData.data, 'base64');

            // Usamos el ID de la primera imagen como "padre" para rastrear
            const parentId = assetIds[0];

            const savedAsset = await _processAndSaveImage({
                buffer: resultBuffer,
                campaignId: campaignId || "fusion-generada",
                prompt: refinementPrompt,
                parentAssetId: parentId
            });

            res.statusCode = 200;
            res.json({
                success: true,
                message: "Fusión completada",
                data: savedAsset,
                text_comment: textResponse
            });

        } else {
            console.warn("Gemini devolvió solo texto:", textResponse);
            res.json({ success: false, type: "text_only", response: textResponse });
        }

    } catch (error) {
        console.error("Error refineAsset:", error);
        res.statusCode = 500;
        res.json({ error: error.message || "Error en fusión con Gemini" });
    }
};