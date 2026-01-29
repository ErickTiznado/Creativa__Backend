import { Storage } from "@google-cloud/storage";
import { VertexAI } from "@google-cloud/vertexai";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

import CampaignAsset from "../model/CampaignAsset.model.js";
import ValidationService, {
  ValidationError,
} from "../services/ValidationService.js";
import PromptBuilder from "../services/PromptBuilder.js";
import VectorCore from "../services/VectorCore.js";
import { ERROR_CODES } from "../services/promptConstants.js";
import GeminiService from "../services/GeminiService.js";

// --- CONFIGURACIÓN DE RUTAS Y LLAVE (Del cambio actual/HEAD) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEY_PATH = path.join(__dirname, "../../config/key/creativa-key.json");

// --- CONFIGURACIÓN DE CLIENTES (GCP & VERTEX) ---
const PROJECT_ID =
  process.env.GCP_PROJECT_ID ||
  process.env.GOOGLE_PROJECT_ID ||
  "ugb-creativamkt-484123";
const LOCATION = "us-central1";
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || "creativa-campaign-assets";
const MODEL_NAME = "gemini-2.5-flash-image";

// A. Storage (Google Drive)
const storage = new Storage({
  projectId: PROJECT_ID,
  keyFilename: KEY_PATH, // Mantenemos auth manual de HEAD
});
const bucket = storage.bucket(BUCKET_NAME);

// B. Vertex AI
const vertexAI = new VertexAI({
  project: PROJECT_ID,
  location: LOCATION,
  googleAuthOptions: { keyFile: KEY_PATH }, // Mantenemos auth manual de HEAD
});

// INSTANCIAR MODELO
const generativeModel = vertexAI.preview.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig: {
    maxOutputTokens: 2048,
    temperature: 0.1, // Usamos 0.1 del HEAD
    responseModalities: ["IMAGE", "TEXT"],
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
      console.log(`[GeneratorController:${requestId}] Iniciando buildPrompt.`);
      const validatedData = ValidationService.validateRequest(
        req.body,
        req.user,
      );
      const { brief, style, dimensions, variations, brandId } = validatedData;

      console.log(
        `[GeneratorController:${requestId}] Validado. Brief len: ${brief.length}`,
      );
      console.log(
        `[GeneratorController:${requestId}] Mejorando brief con Gemini...`,
      );

      const enhancedBrief = await GeminiService.enhanceBrief(brief, style);

      console.log(
        `[GeneratorController:${requestId}] Brief Original: "${brief}"`,
      );
      console.log(
        `[GeneratorController:${requestId}] Brief Mejorado: "${enhancedBrief.substring(0, 50)}..."`,
      );

      console.log(
        `[GeneratorController:${requestId}] Buscando contexto RAG...`,
      );
      const context = await this.getContextWithFallback(
        brandId,
        enhancedBrief,
        requestId,
      );

      const optimizedPrompt = PromptBuilder.build({
        brief: enhancedBrief,
        context,
        style,
        dimensions,
      });

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
            enhancedBriefLength: enhancedBrief.length,
            params: { style, dimensions, variations },
            processingTime: duration,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error(`[GeneratorController:${requestId}] Error:`, error);
      if (error instanceof ValidationError) {
        res.statusCode = error.statusCode;
        return res.json({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      res.statusCode = 500;
      return res.json({
        success: false,
        error: { code: ERROR_CODES.INTERNAL_ERROR, message: "Internal Error" },
      });
    }
  }

  /**
   * Generación de Imágenes (Texto a Imagen)
   */
  async generateImages(req, res) {
    const startTime = Date.now();
    const requestId = `img_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log(
        `[GeneratorController:${requestId}] Iniciando generateImages con ${MODEL_NAME}.`,
      );

      const validatedData = ValidationService.validateImageGenerationRequest(
        req.body,
      );
      // Extraer parámetros incluyendo nuevo 'style'
      const {
        prompt: userPromptSpanish,
        aspectRatio,
        sampleCount,
        campaignId,
        style,
      } = validatedData;

      // Brand ID del usuario (requiere auth)
      const brandId = req.user ? req.user.userId : "anonymous";

      // 1. Mejora de Brief (Gemini)
      console.log(`[GeneratorController:${requestId}] Mejorando brief...`);
      const enhancedBrief = await GeminiService.enhanceBrief(
        userPromptSpanish,
        style,
      );

      // 2. Contexto RAG (API -> Memoria)
      console.log(
        `[GeneratorController:${requestId}] Buscando contexto RAG...`,
      );
      const context = await this.getContextWithFallback(
        brandId,
        enhancedBrief,
        requestId,
      );

      // 3. Construcción del Prompt Estructurado
      const structuredPrompt = PromptBuilder.build({
        brief: enhancedBrief,
        context,
        style,
        dimensions: aspectRatio,
      });

      // 4. Optimización para Modelo de Imagen (ES -> Inglés Técnico)
      // Se envía el prompt COMPLETAMENTE ESTRUCTURADO para que Gemini lo traduzca/refine a un prompt de imagen final
      console.log(
        `[GeneratorController:${requestId}] Optimizando prompt estructurado para modelo (ES -> EN)...`,
      );
      const technicalPromptEnglish =
        await GeminiService.optimizeForImageModel(structuredPrompt);

      const activeCampaignId = campaignId || "unsorted-assets";

      // 5. Preparar parts para el request (prompt + imágenes de referencia opcionales)
      const parts = [{ text: technicalPromptEnglish }];

      // 6. Agregar imágenes de referencia si se proporcionaron
      const { referenceImages } = req.body;
      if (
        referenceImages &&
        Array.isArray(referenceImages) &&
        referenceImages.length > 0
      ) {
        console.log(
          `[GeneratorController:${requestId}] Procesando ${referenceImages.length} imágenes de referencia...`,
        );

        for (const imgUrl of referenceImages) {
          try {
            // Descargar imagen
            const responseImg = await axios.get(imgUrl, {
              responseType: "arraybuffer",
            });
            const baseImageBuffer = Buffer.from(responseImg.data);
            const base64Image = baseImageBuffer.toString("base64");

            // Detectar mime type
            const mimeType = imgUrl.endsWith("png")
              ? "image/png"
              : "image/jpeg";

            // Agregar a parts
            parts.push({
              inlineData: {
                mimeType: mimeType,
                data: base64Image,
              },
            });
          } catch (imgError) {
            console.warn(
              `[GeneratorController:${requestId}] Error procesando imagen de referencia ${imgUrl}:`,
              imgError.message,
            );
            // Continuar con las demás imágenes
          }
        }
      }

      const reqContent = {
        contents: [{ role: "user", parts: parts }],
      };

      console.log(
        `[GeneratorController:${requestId}] Enviando prompt final a Gemini${parts.length > 1 ? ` con ${parts.length - 1} imagen(es) de referencia` : ""}...`,
      );

      const result = await generativeModel.generateContent(reqContent);
      const response = await result.response;
      const candidates = response.candidates || [];

      if (candidates.length === 0) {
        throw new Error("Gemini no devolvió candidatos.");
      }

      const processedAssets = [];

      for (const candidate of candidates) {
        const parts = candidate.content.parts || [];
        const imagePart = parts.find((p) => p.inlineData);

        if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
          console.log(
            `[GeneratorController:${requestId}] Imagen recibida (Base64). Procesando...`,
          );
          const buffer = Buffer.from(imagePart.inlineData.data, "base64");

          const savedAsset = await this._processAndSaveImage({
            buffer,
            campaignId: activeCampaignId,
            prompt: technicalPromptEnglish, // Guardamos el prompt técnico final
          });

          processedAssets.push(savedAsset);
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `[GeneratorController:${requestId}] Finalizado. ${processedAssets.length} imágenes guardadas.`,
      );

      if (processedAssets.length === 0) {
        throw new Error(
          "Gemini respondió pero no generó datos de imagen válidos.",
        );
      }

      res.statusCode = 200;
      return res.json({
        success: true,
        data: {
          assets: processedAssets,
          metadata: {
            requestId,
            count: processedAssets.length,
            model: MODEL_NAME,
            processingTime: duration,
            contextSource: context.source,
            ragRelevance: context.relevanceScore,
          },
        },
      });
    } catch (error) {
      this._handleError(res, error, requestId);
    }
  }

  /**
   * Subida de Archivos (Endpoint de HEAD integrado)
   */
  async saveToStorage(req, res) {
    try {
      const { campaignId, prompt } = req.body;

      if (!campaignId || !req.files) {
        res.statusCode = 400;
        return res.json({
          error: "Faltan datos requeridos (campaignId o archivos)",
        });
      }

      let filesArray = [];
      if (req.files.images) {
        filesArray = filesArray.concat(req.files.images);
      }
      if (req.files.image) {
        filesArray = filesArray.concat(req.files.image);
      }
      if (filesArray.length === 0) {
        Object.keys(req.files).forEach((key) => {
          if (key !== "images" && key !== "image") {
            filesArray = filesArray.concat(req.files[key]);
          }
        });
      }

      if (filesArray.length === 0) {
        res.statusCode = 400;
        return res.json({ error: "No se subió ningún archivo válido." });
      }

      console.log(`Recibidos ${filesArray.length} archivos para subir.`);

      const uploadPromises = filesArray.map(async (file) => {
        return await this._processAndSaveImage({
          buffer: file.data,
          campaignId,
          prompt,
        });
      });

      const results = await Promise.all(uploadPromises);

      res.statusCode = 201;
      res.json({
        success: true,
        message: "Archivos subidos correctamente",
        count: results.length,
        data: results,
      });
    } catch (error) {
      console.error("Error saveToStorage:", error);
      res.statusCode = 500;
      res.json({ error: error.message });
    }
  }

  /**
   * Refinamiento Multimodal (Endpoint de HEAD integrado)
   */
  async refineAsset(req, res) {
    try {
      let { assetIds, refinementPrompt } = req.body;
      if (req.body.assetId) {
        assetIds = [req.body.assetId];
      }

      if (
        !assetIds ||
        !Array.isArray(assetIds) ||
        assetIds.length === 0 ||
        !refinementPrompt
      ) {
        res.statusCode = 400;
        return res.json({
          error: "Faltan datos: assetIds (array) o refinementPrompt",
        });
      }

      const parts = [{ text: refinementPrompt }];
      let campaignId = null;

      console.log(`Procesando ${assetIds.length} imágenes para fusión...`);

      for (const id of assetIds) {
        const assets = await CampaignAsset.where("id", id).get();
        const assetObj = assets && assets.length > 0 ? assets[0] : null;

        if (!assetObj) {
          console.warn(`⚠️ Asset ID ${id} no encontrado, saltando...`);
          continue;
        }

        if (!campaignId) campaignId = assetObj.campaign_assets;

        let imgUrl = assetObj.img_url;
        if (typeof imgUrl === "object" && imgUrl.url) imgUrl = imgUrl.url;

        const responseImg = await axios.get(imgUrl, {
          responseType: "arraybuffer",
        });
        const baseImageBuffer = Buffer.from(responseImg.data);
        const base64Image = baseImageBuffer.toString("base64");
        const mimeType = imgUrl.endsWith("png") ? "image/png" : "image/jpeg";

        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        });
      }

      if (parts.length < 2) {
        return res
          .status(400)
          .json({ error: "No se pudieron procesar las imágenes solicitadas." });
      }

      const reqContent = {
        contents: [
          {
            role: "user",
            parts: parts,
          },
        ],
      };

      console.log(
        `Enviando a Gemini (${MODEL_NAME}) con ${parts.length - 1} imágenes...`,
      );

      const result = await generativeModel.generateContent(reqContent);
      const response = await result.response;
      const candidate = response.candidates[0];
      const imageData = candidate.content.parts.find((part) => part.inlineData);

      let textResponse = "";
      candidate.content.parts.forEach((part) => {
        if (part.text) textResponse += part.text;
      });

      if (imageData) {
        console.log("¡Fusión Exitosa! Imagen generada.");
        const resultBuffer = Buffer.from(imageData.inlineData.data, "base64");
        const parentId = assetIds[0];

        const savedAsset = await this._processAndSaveImage({
          buffer: resultBuffer,
          campaignId: campaignId || "fusion-generada",
          prompt: refinementPrompt,
          parentAssetId: parentId,
        });

        res.statusCode = 200;
        res.json({
          success: true,
          message: "Fusión completada",
          data: savedAsset,
          text_comment: textResponse,
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
  }

  /**
   * Helper Privado: Procesa Buffer, sube a GCS y guarda en Supabase
   */
  async _processAndSaveImage({
    buffer,
    campaignId,
    prompt,
    parentAssetId = null,
  }) {
    const metadata = await sharp(buffer).metadata();
    const isJpg = metadata.format === "jpeg" || metadata.format === "jpg";
    const contentType = isJpg ? "image/jpeg" : "image/png";
    const ext = isJpg ? "jpeg" : "png";

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

    const uploadOptions = {
      metadata: { contentType },
      contentType,
      resumable: false,
    };

    await Promise.all([
      fileOriginal.save(buffer, uploadOptions),
      fileThumb.save(thumbBuffer, uploadOptions),
    ]);

    const urlOriginal = `https://storage.googleapis.com/${BUCKET_NAME}/${fileNameOriginal}`;
    const urlThumb = `https://storage.googleapis.com/${BUCKET_NAME}/${fileNameThumb}`;

    const assetJson = { url: urlOriginal, thumbnail: urlThumb };
    const finalCampaignId =
      campaignId && campaignId !== "unsorted-assets"
        ? campaignId
        : "00000000-0000-0000-0000-000000000000";

    const assetData = {
      campaign_assets: finalCampaignId,
      img_url: assetJson,
      prompt_used: prompt || "",
      is_approved: true,
      parent_asset_id: parentAssetId,
    };

    const newAsset = await CampaignAsset.create(assetData);
    return {
      ...assetData,
      id: newAsset?.id,
    };
  }

  async getContextWithFallback(brandId, brief, requestId) {
    try {
      console.log(
        `[GeneratorController:${requestId}] Obteniendo vectores vía API...`,
      );

      // 1. Obtener todos los manuales de la API
      const PORT = process.env.PORT || 3000;
      const apiUrl = `http://localhost:${PORT}/rag/getManualVectors`;
      const { data: allVectors } = await axios.get(apiUrl);

      if (
        !allVectors ||
        !Array.isArray(allVectors) ||
        allVectors.length === 0
      ) {
        console.warn(
          `[GeneratorController:${requestId}] API retorno lista vacía.`,
        );
        return this.getGenericBrandContext(brandId);
      }

      // 2. Vectorizar el brief actual
      const briefEmbedding = await VectorCore.embed(brief);

      // 3. Filtrar y buscar similitud en memoria
      // El usuario indicó que los manuales son globales, no filtramos por brandId.
      const candidates = allVectors;

      if (candidates.length === 0) {
        console.warn(
          `[GeneratorController:${requestId}] No se encontraron manuales (Global).`,
        );
        return this.getGenericBrandContext(brandId); // Fallback aunque sea global si no hay nada
      }

      // Calcular similitud coseno
      const scoredCandidates = candidates
        .map((item) => {
          let itemEmbedding = item.embedding;
          if (typeof itemEmbedding === "string") {
            try {
              itemEmbedding = JSON.parse(itemEmbedding);
            } catch (e) {
              return null;
            }
          }

          if (!Array.isArray(itemEmbedding)) return null;

          const score = this._cosineSimilarity(briefEmbedding, itemEmbedding);
          return { ...item, score };
        })
        .filter((item) => item !== null);

      // Ordenar por similitud descendente
      scoredCandidates.sort((a, b) => b.score - a.score);

      // Tomar los top 3
      const topResults = scoredCandidates.slice(0, 3);

      if (topResults.length > 0) {
        return {
          source: "rag_api",
          relevanceScore: topResults[0].score, // Score del mejor match
          data: this.formatRagResults(topResults),
        };
      }

      return this.getGenericBrandContext(brandId);
    } catch (e) {
      console.warn(
        `[GeneratorController:${requestId}] RAG API Error: ${e.message}`,
      );
      return this.getGenericBrandContext(brandId);
    }
  }

  _cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  formatRagResults(results) {
    return {
      guidelines: results.map((r) => r.content).slice(0, 5),
    };
  }

  getGenericBrandContext(brandId) {
    return {
      source: "fallback",
      relevanceScore: 0,
      data: {
        colors: { primary: "#000000", secondary: "#FFFFFF" },
        typography: { heading: "Sans-serif", body: "Sans-serif" },
        visualStyle: "Professional",
        guidelines: ["Maintain brand consistency"],
      },
    };
  }

  _handleError(res, error, requestId) {
    console.error(`[GeneratorController:${requestId}] Error:`, error.message);
    if (error instanceof ValidationError) {
      res.statusCode = error.statusCode;
      return res.json({
        success: false,
        error: { code: error.code, message: error.message },
      });
    }
    if (
      error.message.includes("SAFETY_BLOCK") ||
      error.message.includes("blocked")
    ) {
      res.statusCode = 400;
      return res.json({
        success: false,
        error: {
          code: "SAFETY_VIOLATION",
          message: "Imagen bloqueada por políticas de seguridad.",
        },
      });
    }
    res.statusCode = 500;
    return res.json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "Error interno del servidor.",
      },
    });
  }
}

export default new GeneratorController();
