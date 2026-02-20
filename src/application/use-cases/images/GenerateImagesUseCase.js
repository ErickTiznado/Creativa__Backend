import ImageGeneratorRequest from "../../../domain/entities/ImageGeneratorRequest.js";
import PromptBuilder from "../../../domain/services/prompt/PromptBuilder.js";

class GenerateImagesUseCase {
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
    const request = new ImageGeneratorRequest(rawRequestData);
    const { prompt, numberOfImages, config, brandId, campaignId, style } = request;

    let retrievedContext = null;
    if (this.contextRetriever) {
      try {
        console.log(`Obteniendo contexto para Marca: ${brandId}, Campaña: ${campaignId}`);
        retrievedContext = await this.contextRetriever.getContext(brandId, campaignId);
        if (retrievedContext) {
          console.log("Contexto obtenido exitosamente.");
        } else {
          console.log("No se encontró contexto específico.");
        }
      } catch (error) {
        console.error("Error al obtener contexto:", error);
        // Continue without context if retrieval fails
      }
    }

    // 1. Construir Prompt Optimizado (Hybrid Approach)
    const enhancedPrompt = PromptBuilder.build({
      brief: prompt,
      context: retrievedContext,
      style: style,
      dimensions: config?.aspectRatio || "16:9",
    });

    console.log("--- GENERANDO CON PROMPT MEJORADO ---");
    console.log(enhancedPrompt);
    console.log("---------------------------------------");

    const buffers = await this.aiPort.generateImages(
      enhancedPrompt,
      config,
      numberOfImages,
    );
    const storageResult = await Promise.all(
      buffers.map(async (imageObj) => {
        const { buffer } = imageObj;
        const uploaded = await this.storagePort.uploadFile(
          buffer,
          buffer,
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
              storage_location: uploaded.status === "gcp" ? "temp" : "temp",
              is_approved: false,
              is_saved: false,
            });
          } catch (error) {
            console.error("Error al guardar metadatos del asset:", error);
            // Non-critical failure for DB save? Ideally should fail or retry.
            // For now, log and continue, but maybe return error info.
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

export default GenerateImagesUseCase;
