import sharp from "sharp";
import ImageEditorRequest from "../../../domain/entities/ImageEditorRequest.js";
import PromptBuilder from "../../../domain/services/prompt/PromptBuilder.js";

class EditImagesUseCase {
  // --- CAMBIO V2.0: Agregamos imageProcessingPort al constructor ---
  constructor(aiPort, storagePort, campaignAssetRepository, contextRetriever, imageProcessingPort) {
    this.aiPort = aiPort;
    this.storagePort = storagePort;
    this.campaignAssetRepository = campaignAssetRepository;
    this.contextRetriever = contextRetriever;
    this.imageProcessingPort = imageProcessingPort; 
  }

  async execute(rawRequestData) {
    const request = new ImageEditorRequest(rawRequestData);
    const {
      baseImageURL,
      maskImageURL,
      referenceImageURLs,
      prompt,
      numberOfImages,
      config,
      brandId,
      campaignId,
      style,
      assetId,
      resolution, // Para resize post-generación
    } = request;

    // --- CAMBIO V2.0: Lo extraemos directo de rawRequestData por si la entidad no lo tiene mapeado ---
    const logoType = rawRequestData.logoType || 'Ninguno';

    let retrievedContext = null;
    if (this.contextRetriever) {
      try {
        console.log(
          `Obteniendo contexto para Marca: ${brandId}, Campaña: ${campaignId}`,
        );
        retrievedContext = await this.contextRetriever.getContext(
          brandId,
          campaignId,
        );
      } catch (error) {
        console.error("Error al obtener contexto:", error);
      }
    }

    const enhancedPrompt = PromptBuilder.build({
      brief: prompt,
      context: retrievedContext,
      style: style,
      mode: "edit",
      hasMask: !!maskImageURL,
    });

    console.log("--- EDITANDO CON PROMPT MEJORADO ---");
    console.log(enhancedPrompt);
    console.log("------------------------------------");

    const buffers = await this.aiPort.editImage(
      baseImageURL,
      referenceImageURLs,
      maskImageURL,
      enhancedPrompt,
      config,
    );

    let rootParentId = null;
    if (assetId && this.campaignAssetRepository) {
      try {
        const parentAsset =
          await this.campaignAssetRepository.findById(assetId);
        rootParentId = parentAsset?.parent_asset_id || assetId;
      } catch (error) {
        console.error("Error resolviendo parent asset:", error);
        rootParentId = assetId;
      }
    }

    const storageResult = await Promise.all(
      buffers.map(async (imageObj) => {
        let finalBuffer = imageObj.buffer;

        // --- RESIZE: igual que en generación, escalamos al tamaño pedido ---
        if (this.imageProcessingPort && resolution) {
          const aspectRatio = config?.imageConfig?.aspectRatio || '1:1';
          finalBuffer = await this.imageProcessingPort.resizeToResolution(
            finalBuffer,
            resolution,
            aspectRatio
          );
        }
        // ------------------------------------------------------------------

        // --- Aplicamos el logo dinámico si se seleccionó uno ---
        if (this.imageProcessingPort && logoType !== 'Ninguno') {
            console.log(`Aplicando marca de agua dinámica en Edición con Sharp (Logo: ${logoType})...`);
            finalBuffer = await this.imageProcessingPort.applyBrandWatermarkDynamic(
              finalBuffer,
              logoType,
              resolution || '1080x1080'
            );
        }

        const thumbnailBuffer = await sharp(finalBuffer)
          .resize({ width: 400, withoutEnlargement: true })
          .png()
          .toBuffer();

        const uploaded = await this.storagePort.uploadFile(
          finalBuffer, // Subimos el buffer con el logo (si aplica)
          thumbnailBuffer,
          request,
        );

        let savedAsset = null;
        if (this.campaignAssetRepository && uploaded.originalUrl) {
          try {
            savedAsset = await this.campaignAssetRepository.save({
              img_url: uploaded.originalUrl,
              thumbnail_url: uploaded.thumbnailUrl,
              prompt_used: enhancedPrompt,
              campaign_id: campaignId,
              status: "draft",
              storage_location: "temp",
              is_approved: false,
              is_saved: false,
              parent_asset_id: rootParentId,
            });
          } catch (error) {
            console.error("Error al guardar metadatos del asset:", error);
            savedAsset = { error: error.message };
          }
        }

        return {
          ...uploaded,
          assetId: savedAsset && savedAsset.id ? savedAsset.id : null,
          savedAsset,
        };
      }),
    );
    return storageResult;
  }
}

export default EditImagesUseCase;