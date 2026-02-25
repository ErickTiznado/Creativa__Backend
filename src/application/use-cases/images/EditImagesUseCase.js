import sharp from 'sharp';
import ImageEditorRequest from "../../../domain/entities/ImageEditorRequest.js";
import PromptBuilder from "../../../domain/services/prompt/PromptBuilder.js";

class EditImagesUseCase {
  constructor(
    aiPort,
    storagePort,
    campaignAssetRepository,
    contextRetriever,
  ) {
    this.aiPort = aiPort;
    this.storagePort = storagePort;
    this.campaignAssetRepository = campaignAssetRepository;
    this.contextRetriever = contextRetriever;
  }

  async execute(rawRequestData) {
    const request = new ImageEditorRequest(rawRequestData);
    const { baseImageURL, maskImageURL, referenceImageURLs, prompt, numberOfImages, config, brandId, campaignId, style, assetId } = request;

    let retrievedContext = null;
    if (this.contextRetriever) {
      try {
        console.log(`Obteniendo contexto para Marca: ${brandId}, Campaña: ${campaignId}`);
        retrievedContext = await this.contextRetriever.getContext(brandId, campaignId);
      } catch (error) {
        console.error("Error al obtener contexto:", error);
      }
    }

    const enhancedPrompt = PromptBuilder.build({
      brief: prompt,
      context: retrievedContext,
      style: style,
      dimensions: config?.aspectRatio || "16:9",
    });

    console.log("--- EDITANDO CON PROMPT MEJORADO ---");
    console.log(enhancedPrompt);
    console.log("------------------------------------");

    const buffers = await this.aiPort.editImage(
      baseImageURL,
      referenceImageURLs,
      maskImageURL,
      enhancedPrompt,
      config
    );

    let rootParentId = null;
    if (assetId && this.campaignAssetRepository) {
      try {
        const parentAsset = await this.campaignAssetRepository.findById(assetId);
        rootParentId = parentAsset?.parent_asset_id || assetId;
      } catch (error) {
        console.error("Error resolviendo parent asset:", error);
        rootParentId = assetId;
      }
    }

    const storageResult = await Promise.all(
      buffers.map(async (imageObj) => {
        const { buffer } = imageObj;

        const thumbnailBuffer = await sharp(buffer)
          .resize({ width: 400, withoutEnlargement: true })
          .png()
          .toBuffer();

        const uploaded = await this.storagePort.uploadFile(
          buffer,
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
              storage_location: "gcp",
              is_approved: false,
              is_saved: false,
              parent_asset_id: rootParentId
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
