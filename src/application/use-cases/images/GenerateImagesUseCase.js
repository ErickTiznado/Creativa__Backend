import sharp from "sharp";
import ImageGeneratorRequest from "../../../domain/entities/ImageGeneratorRequest.js";
import PromptBuilder from "../../../domain/services/prompt/PromptBuilder.js";

class GenerateImagesUseCase {
  constructor(
    aiPort,
    storagePort,
    campaignAssetRepository,
    contextRetriever,
    imageProcessingPort,
  ) {
    this.aiPort = aiPort;
    this.storagePort = storagePort;
    this.campaignAssetRepository = campaignAssetRepository;
    this.contextRetriever = contextRetriever;
    this.imageProcessingPort = imageProcessingPort;
  }

  async execute(rawRequestData) {
    const request = new ImageGeneratorRequest(rawRequestData);


    // --- CAMBIO v2.0: Extraemos resolution y logoType ---
    const { 
      prompt, numberOfImages, config, brandId, campaignId, 
      style, referenceImageURLs, referenceType, resolution, logoType 
    } = request;

    // BLINDAJE EXTRA: Lo sacamos de rawRequestData por si la entidad falló
    const methodToUse = request.methodToUse || rawRequestData.methodToUse || 'sharp';

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
      mode: "generate",
    });

if (methodToUse === "ai") {
  if (logoType === 'Creativa') {
    const brandInstructions = `\n\nINSTRUCCIONES DE IDENTIDAD DE MARCA: Inserta obligatoriamente el logo de "creativa STUDIOS" en la esquina superior izquierda respetando su zona de protección. No deformes el logo ni quites elementos. Usa estrictamente uno de estos tres colores según el contraste del fondo, prohibido cambiar a otro color: Rojo (#da0d15), Negro (#000000) o Blanco (#ffffff).`;
    enhancedPrompt = `${enhancedPrompt}${brandInstructions}`;
  } else if (logoType === 'Visible') {
    const brandInstructions = `\n\nINSTRUCCIONES DE IDENTIDAD DE MARCA: Inserta obligatoriamente el logo de la marca "Visible" en la esquina superior izquierda respetando su zona de protección.`;
    enhancedPrompt = `${enhancedPrompt}${brandInstructions}`;
  }
  // Si logoType es 'Ninguno', no inyectamos ninguna instrucción de marca.
}

    console.log("--- GENERANDO CON PROMPT MEJORADO ---");
    console.log(enhancedPrompt);
    console.log(`--- MÉTODO DE LOGO SELECCIONADO: ${methodToUse} ---`);

    // --- CAMBIO v2.0: Le pasamos la resolución al adaptador de IA ---
    const buffers = await this.aiPort.generateImages(
      enhancedPrompt,
      config,
      numberOfImages,
      referenceImageURLs,
      referenceType,
      resolution // NUEVO PARÁMETRO
    );

    const storageResult = await Promise.all(
      buffers.map(async (imageObj) => {
        let finalBuffer = imageObj.buffer;

        // --- RESIZE: Gemini genera en resolución nativa. Escalamos al tamaño pedido. ---
        if (this.imageProcessingPort && resolution) {
          const aspectRatio = config?.imageConfig?.aspectRatio || '1:1';
          finalBuffer = await this.imageProcessingPort.resizeToResolution(
            finalBuffer,
            resolution,
            aspectRatio
          );
        }
        // -------------------------------------------------------------------------

        if (methodToUse === "sharp" && this.imageProcessingPort) {
          console.log(`Aplicando marca de agua dinámica con Sharp (Logo: ${logoType})...`);
          
          // --- CAMBIO v2.0: Le pasamos el tipo de logo y la resolución a Sharp ---
          finalBuffer = await this.imageProcessingPort.applyBrandWatermarkDynamic(
            finalBuffer,
            logoType,
            resolution
          );
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
              storage_location: "temp",
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