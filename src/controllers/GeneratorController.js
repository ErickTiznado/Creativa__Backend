import ValidationService, {
  ValidationError,
} from "../services/ValidationService.js";
import PromptBuilder from "../services/PromptBuilder.js";
import { ERROR_CODES } from "../services/promptConstants.js";
import GeminiService from "../services/GeminiService.js";
import RagService from "../services/RagService.js";
import ImageStorageService from "../services/ImageStorageService.js";

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
      const { brief, style, dimensions, variations, brandId } = validatedData;

      const enhancedBrief = await GeminiService.enhanceBrief(brief, style);

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
      } = ValidationService.validateImageGenerationRequest(req.body);

      const brandId = req.user ? req.user.userId : "anonymous";

      // 1. Mejora y Contexto
      const enhancedBrief = await GeminiService.enhanceBrief(
        userPromptSpanish,
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

      // 3. Optimización para Modelo (ES -> EN)
      const technicalPromptEnglish =
        await GeminiService.optimizeForImageModel(structuredPrompt);

      const activeCampaignId = campaignId || "unsorted-assets";

      // 4. Generación via GeminiService (Incluye manejo de imagenes de referencia)
      // Delegamos la descarga y preparación de imágenes de referencia al servicio.
      const imageBuffers = await GeminiService.generateImages({
        prompt: technicalPromptEnglish,
        referenceImages: req.body.referenceImages,
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
            prompt: technicalPromptEnglish,
            isDraft: true
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

      res.status(201).json({
        success: true,
        message: "Archivos subidos correctamente",
        data: results,
      });
    } catch (error) {
      console.error("Error saveToStorage:", error);
      res.status(500).json({ error: error.message });
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
        return res.status(400).json({ success: false, error: "assetId es requerido" });
      }

      console.log(`[GeneratorController:${requestId}] Aprobando asset ${assetId}`);

      // Llamamos a tu servicio (notar la 'd' en approvedAsset)
      await ImageStorageService.approvedAsset(assetId, userId);

      return res.json({
        success: true,
        message: "Asset aprobado y movido a permanente",
        metadata: { requestId }
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
        return res.status(400).json({ success: false, error: "assetId es requerido" });
      }

      console.log(`[GeneratorController:${requestId}] Rechazando asset ${assetId}`);

      await ImageStorageService.rejectAsset(assetId, userId, reason);

      return res.json({
        success: true,
        message: "Asset rechazado",
        metadata: { requestId }
      });

    } catch (error) {
      this._handleError(res, error, requestId);
    }
  }


  /**
   * Refinamiento Multimodal
   */
  async refineAsset(req, res) {
    try {
      const { assetIds, refinementPrompt } = req.body;
      if (!assetIds || !refinementPrompt)
        throw new Error("Faltan assetIds o prompt");

      const ids = Array.isArray(assetIds) ? assetIds : [assetIds];

      // 1. Obtener partes (imágenes) desde ImageStorage
      const { parts, campaignId } =
        await ImageStorageService.fetchAssetsAsGeminiParts(ids);

      if (parts.length === 0)
        throw new Error("No se pudieron recuperar las imágenes originales");

      // 2. Llamar a Gemini para refinar
      const result = await GeminiService.refineImage(refinementPrompt, parts);

      if (result.buffer) {
        // 3. Guardar resultado
        const savedAsset = await ImageStorageService.processAndSaveImage({
          buffer: result.buffer,
          campaignId: campaignId || "fusion-generada",
          prompt: refinementPrompt,
          parentAssetId: ids[0],
          isDraft: true
        });

        res.json({
          success: true,
          message: "Fusión completada",
          data: savedAsset,
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
      console.error("Error refineAsset:", error);
      res.status(500).json({ error: error.message });
    }
  }

  _handleError(res, error, requestId) {
    console.error(`[GeneratorController:${requestId}] Error:`, error.message);
    if (error instanceof ValidationError) {
      return res
        .status(error.statusCode)
        .json({ success: false, error: { code: error.code, message: error.message } });
    }
    if (error.message.includes("SAFETY_BLOCK") || error.message.includes("blocked")) {
      return res.status(400).json({ success: false, error: { code: "SAFETY_VIOLATION", message: "Bloqueo se seguridad." } });
    }
    return res
      .status(500)
      .json({ success: false, error: { code: ERROR_CODES.INTERNAL_ERROR, message: error.message } });
  }
}

export default new GeneratorController();
