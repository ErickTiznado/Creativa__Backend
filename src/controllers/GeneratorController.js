import ValidationService, {
  ValidationError,
} from "../services/ValidationService.js";
import PromptBuilder from "../services/PromptBuilder.js";
import { ERROR_CODES } from "../services/promptConstants.js";
import GeminiService from "../services/GeminiService.js";
import RagService from "../services/RagService.js";
import ImageStorageService from "../services/ImageStorageService.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Brief from "../model/Brief.model.js";
import InpaintingService from "../services/InpaintingService.js";

// Fix para __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * GeneratorController
 * Orquestador principal de la generación. Delega la lógica pesada a servicios especializados.
 */
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
      const { brief, style, dimensions, variations, brandId, campaignId } =
        validatedData;

      let finalBrief = brief;
      const campaignContext = await this._getCampaignContext(campaignId);
      if (campaignContext) {
        finalBrief = `${brief}. \n\n[CAMPAIGN CONTEXT]: ${campaignContext}`;
      }

      const enhancedBrief = await GeminiService.enhanceBrief(finalBrief, style);

      // Usando RagService
      const context = await RagService.getContext(
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

      res.statusCode = 200;
      return res.json({
        success: true,
        data: {
          prompt: optimizedPrompt,
          metadata: {
            requestId,
            contextSource: context.source,
            generatedAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      this._handleError(res, error, requestId);
    }
  }

  /**
   * Generación de Imágenes (Texto a Imagen)
   */
  async generateImages(req, res) {
    const startTime = Date.now();
    const requestId = `img_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log(`[GeneratorController:${requestId}] Iniciando Generación.`);

      const {
        prompt: userPromptSpanish,
        aspectRatio,
        campaignId,
        style,
        sampleCount,
      } = ValidationService.validateImageGenerationRequest(req.body);

      const brandId = req.user ? req.user.userId : "anonymous";

      // 1. Mejora y Contexto
      let finalPromptInput = userPromptSpanish;
      const campaignContext = await this._getCampaignContext(campaignId);
      if (campaignContext) {
        finalPromptInput = `${userPromptSpanish}. \n\n[CAMPAIGN CONTEXT]: ${campaignContext}`;
      }

      const enhancedBrief = await GeminiService.enhanceBrief(
        finalPromptInput,
        style,
      );
      const context = await RagService.getContext(
        brandId,
        enhancedBrief,
        requestId,
      );

      // 2. Prompt Estructurado
      const structuredPrompt = PromptBuilder.build({
        brief: enhancedBrief,
        context,
        style,
        dimensions: aspectRatio,
      });

      // 3. Optimización OMITIDA (Para preservar estructura Sandwich)
      // El prompt ya viene estructurado del Builder (y el brief en Inglés del paso 1)
      const finalPrompt = structuredPrompt;

      const activeCampaignId = campaignId || "unsorted-assets";

      // -----------------------------------------------------
      // LOGIC FOR MANDATORY REFERENCES (LOGO & STYLE)
      // -----------------------------------------------------
      const mandatoryReferences = await this._getMandatoryShowcaseImages();

      if (mandatoryReferences.length > 0) {
        console.log(
          `[GeneratorController:${requestId}] Inyectando ${mandatoryReferences.length} referencias locales.`,
        );
      }

      // Combinar referencias del body (si las hay) con las obligatorias
      const combinedReferences = [
        ...(req.body.referenceImages || []),
        ...mandatoryReferences,
      ];

      // 4. Generación via GeminiService (Incluye manejo de imagenes de referencia)
      // Delegamos la descarga y preparación de imágenes de referencia al servicio.
      const imageBuffers = await GeminiService.generateImages({
        prompt: finalPrompt,
        referenceImages: combinedReferences,
        aspectRatio: aspectRatio,
        numberOfImages: sampleCount,
      });

      console.log(
        `[GeneratorController:${requestId}] ${imageBuffers.length} imágenes generadas. Guardando...`,
      );

      // 5. Guardado
      const savedAssets = await Promise.all(
        imageBuffers.map((buffer) =>
          ImageStorageService.processAndSaveImage({
            buffer,
            campaignId: activeCampaignId,
            prompt: finalPrompt,
            isDraft: true,
          }),
        ),
      );

      res.statusCode = 200;
      return res.json({
        success: true,
        data: {
          assets: savedAssets,
          metadata: {
            requestId,
            count: savedAssets.length,
            processingTime: Date.now() - startTime,
          },
        },
      });
    } catch (error) {
      this._handleError(res, error, requestId);
    }
  }

  /**
   * Helper privado para obtener referencias obligatorias
   */
  async _getMandatoryShowcaseImages() {
    const referencesDir = path.join(__dirname, "../references");
    try {
      const files = await fs.readdir(referencesDir);
      return files
        .filter((file) => /\.(png|jpg|jpeg)$/i.test(file))
        .map((file) => path.join(referencesDir, file));
    } catch (err) {
      console.warn(
        `[GeneratorController] No referencias locales en ${referencesDir}: ${err.message}`,
      );
      return [];
    }
  }

  /**
   * Subida de Archivos
   */
  async saveToStorage(req, res) {
    try {
      const { campaignId, prompt } = req.body;
      if (!campaignId || !req.files) throw new Error("Datos incompletos");

      let filesArray = [];
      if (req.files.images) filesArray = filesArray.concat(req.files.images);
      if (req.files.image) filesArray = filesArray.concat(req.files.image);
      // Fallback para otros keys
      if (filesArray.length === 0) {
        Object.keys(req.files).forEach((key) => {
          if (key !== "images" && key !== "image")
            filesArray = filesArray.concat(req.files[key]);
        });
      }

      const results = await Promise.all(
        filesArray.map((file) =>
          ImageStorageService.processAndSaveImage({
            buffer: file.data,
            campaignId,
            prompt,
          }),
        ),
      );

      res.statusCode = 201;
      res.json({
        success: true,
        message: "Archivos subidos correctamente",
        data: results,
      });
    } catch (error) {
      console.error("Error saveToStorage:", error);
      res.statusCode = 500;
      res.json({ error: error.message });
    }
  }

  /**
   * Aprobar Asset (Temp -> Approved)
   * POST /generator/approve-asset
   */
  async approveAsset(req, res) {
    const startTime = Date.now();
    const requestId = `apprv_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const { assetId } = req.body;
      // Tu middleware requireAuth pone el usuario en req.user
      const userId = req.user ? req.user.userId : "system";

      if (!assetId) {
        res.statusCode = 400;
        return res.json({ success: false, error: "assetId es requerido" });
      }

      console.log(
        `[GeneratorController:${requestId}] Aprobando asset ${assetId}`,
      );

      // Llamamos a tu servicio (notar la 'd' en approvedAsset)
      await ImageStorageService.approvedAsset(assetId, userId);

      return res.json({
        success: true,
        message: "Asset aprobado y movido a permanente",
        metadata: { requestId },
      });
    } catch (error) {
      this._handleError(res, error, requestId);
    }
  }

  /**
   * Rechazar Asset
   * POST /generator/reject-asset
   */
  async rejectAsset(req, res) {
    const startTime = Date.now();
    const requestId = `rjct_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const { assetId, reason } = req.body;
      const userId = req.user ? req.user.userId : "system";

      if (!assetId) {
        res.statusCode = 400;
        return res.json({ success: false, error: "assetId es requerido" });
      }

      console.log(
        `[GeneratorController:${requestId}] Rechazando asset ${assetId}`,
      );

      await ImageStorageService.rejectAsset(assetId, userId, reason);

      return res.json({
        success: true,
        message: "Asset rechazado",
        metadata: { requestId },
      });
    } catch (error) {
      this._handleError(res, error, requestId);
    }
  }

  /**
   * Refinamiento Multimodal
   */
  async refineAsset(req, res) {
    const startTime = Date.now();
    const requestId = `refine_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // 1. Validar y Extraer datos (Igual que generatedImages)
      // Nota: validationService podría no tener validación específica para "refine" con estos campos,
      // así que extraemos manual o reutilizamos validateImageGenerationRequest si encaja.
      // Para flexibilidad, lo hacemos manual aqui pero siguiendo la estructura.

      const {
        assetIds,
        refinementPrompt, // Se trata como el "Brief" del usuario
        style,
        aspectRatio,
        campaignId,
      } = req.body;

      if (!assetIds || !refinementPrompt) {
        throw new Error("Faltan assetIds o refinementPrompt");
      }

      const ids = Array.isArray(assetIds) ? assetIds : [assetIds];
      const brandId = req.user ? req.user.userId : "anonymous";
      const userPrompt = refinementPrompt;

      console.log(
        `[GeneratorController:${requestId}] Iniciando Refinamiento/Fusión. Assets: ${ids.length}`,
      );

      // 2. Mejora del Brief (Gemini)
      const enhancedBrief = await GeminiService.enhanceBrief(userPrompt, style);

      // 3. Contexto RAG
      const context = await RagService.getContext(
        brandId,
        enhancedBrief,
        requestId,
      );

      // 4. Prompt Estructurado (Builder)
      const finalPrompt = PromptBuilder.build({
        brief: enhancedBrief,
        context,
        style,
        dimensions: aspectRatio, // Puede ser undefined, PromptBuilder lo maneja
      });

      // 5. Obtener assets originales (Subject)
      const { parts, campaignId: fetchedCampaignId } =
        await ImageStorageService.fetchAssetsAsGeminiParts(ids);

      if (parts.length === 0)
        throw new Error("No se pudieron recuperar las imágenes originales");

      // 6. Referencias Obligatorias (Logo, Estilo)
      const mandatoryReferences = await this._getMandatoryShowcaseImages();

      // 7. Llamar a Gemini para refinar (Inyectando Prompt Estructurado + Refs)
      const result = await GeminiService.refineImage(
        finalPrompt,
        parts,
        mandatoryReferences,
      );

      // 8. Guardar resultado
      if (result.buffer) {
        const activeCampaignId =
          campaignId || fetchedCampaignId || "fusion-generada";

        const savedAsset = await ImageStorageService.processAndSaveImage({
          buffer: result.buffer,
          campaignId: activeCampaignId,
          prompt: finalPrompt,
          parentAssetId: ids[0], // Linkeamos al primero como padre principal
          isDraft: true,
        });

        res.json({
          success: true,
          message: "Refinamiento completado",
          data: savedAsset,
          metadata: {
            requestId,
            processingTime: Date.now() - startTime,
            enhancedPrompt: finalPrompt,
          },
          text_comment: result.text,
        });
      } else {
        res.json({
          success: false,
          type: "text_only",
          response: result.text,
        });
      }
    } catch (error) {
      this._handleError(res, error, requestId);
    }
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
        error: { code: "SAFETY_VIOLATION", message: "Bloqueo se seguridad." },
      });
    }
    res.statusCode = 500;
    return res.json({
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: error.message },
    });
  }
  /**
   * EDICIÓN DE IMAGENES (Inpainting)
   * POST /generator/edit-image
   */
  async editImage(req, res) {
    const startTime = Date.now();
    const requestId = `edit_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log(
        `[GeneratorController:${requestId}] Iniciando Edición/Inpainting.`,
      );

      // 1. Validar
      const validatedData = ValidationService.validateInpaintingRequest(
        req.body,
      );
      const { assetId, prompt, maskImage, referenceImages } = validatedData;

      // Si hay usuario autenticado, usamos su ID, sino 'anonymous'
      const brandId = req.user ? req.user.userId : "anonymous";

      console.log(
        `[GeneratorController] Recibido editImage. AssetId: ${assetId}, ReferenceImages: ${referenceImages?.length || 0}`,
      );

      const result = await InpaintingService.processInpainting({
        assetId,
        prompt,
        maskImage,
        brandId,
        referenceImages,
      });

      res.json({
        success: true,
        data: result,
        metadata: {
          requestId,
          processingTime: Date.now() - startTime,
        },
      });
    } catch (error) {
      this._handleError(res, error, requestId);
    }
  }

  async _getCampaignContext(campaignId) {
    if (!campaignId || campaignId === "unsorted-assets") return null;
    try {
      const campaigns = await Brief.where("id", campaignId).get();
      if (campaigns && campaigns.length > 0) {
        return campaigns[0].brief_data
          ? JSON.stringify(campaigns[0].brief_data)
          : null;
      }
    } catch (error) {
      console.warn(
        `[GeneratorController] Error fetching campaign context: ${error.message}`,
      );
    }
    return null;
  }
}

export default new GeneratorController();
