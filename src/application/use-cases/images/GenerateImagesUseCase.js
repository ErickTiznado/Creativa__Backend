import sharp from 'sharp';
import ImageGeneratorRequest from "../../../domain/entities/ImageGeneratorRequest.js";
import PromptBuilder from "../../../domain/services/prompt/PromptBuilder.js";

class GenerateImagesUseCase {
  constructor(
    aiPort,
    storagePort,
    campaignAssetRepository,
    contextRetriever,
    imageProcessingPort
  ) {
    this.aiPort = aiPort;
    this.storagePort = storagePort;
    this.campaignAssetRepository = campaignAssetRepository;
    this.contextRetriever = contextRetriever;
    this.imageProcessingPort = imageProcessingPort;
  }

  async execute(rawRequestData) {
    const request = new ImageGeneratorRequest(rawRequestData);

    const { prompt, numberOfImages, config, brandId, campaignId, style } = request;
    const methodToUse = request.methodToUse || rawRequestData.methodToUse || 'sharp';

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
      }
    }

    let enhancedPrompt = PromptBuilder.build({
      brief: prompt,
      context: retrievedContext,
      style: style,
      dimensions: config?.aspectRatio || "16:9",
    });

    if (methodToUse === 'ai') {
      const brandInstructions = `\n\nINSTRUCCIONES DE IDENTIDAD DE MARCA: Inserta obligatoriamente el logo de "creativa STUDIOS" en la esquina superior izquierda respetando su zona de protección. No deformes el logo ni quites elementos. Usa estrictamente uno de estos tres colores según el contraste del fondo, prohibido cambiar a otro color: Rojo (#da0d15), Negro (#000000) o Blanco (#ffffff).`;
      enhancedPrompt = `${enhancedPrompt}${brandInstructions}`;
    }

    console.log("--- GENERANDO CON PROMPT MEJORADO ---");
    console.log(enhancedPrompt);
    console.log(`--- MÉTODO DE LOGO SELECCIONADO: ${methodToUse} ---`);

    const buffers = await this.aiPort.generateImages(
      enhancedPrompt,
      config,
      numberOfImages,
    );

    const storageResult = await Promise.all(
      buffers.map(async (imageObj) => {
        let finalBuffer = imageObj.buffer;

        if (methodToUse === 'sharp' && this.imageProcessingPort) {
          console.log("Aplicando marca de agua dinámica con Sharp...");
          finalBuffer = await this.imageProcessingPort.applyBrandWatermarkDynamic(finalBuffer);
        }

        const thumbnailBuffer = await sharp(finalBuffer)
          .resize({ width: 400, withoutEnlargement: true })
          .png()
          .toBuffer();

        const uploaded = await this.storagePort.uploadFile(
          finalBuffer,
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

export default GenerateImagesUseCase;
