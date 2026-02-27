import GenerateImagesUseCase from "../../../application/use-cases/images/GenerateImagesUseCase.js";
import GcpStorageAdapter from "../../external-services/storage/GcpStorageAdapter.js";
import GeminiImageAdapter from "../../external-services/gemini/GeminiImageAdapter.js";
import genAiClient from "../../external-services/gemini/genAiClient.js";
import gcsClient from "../../external-services/storage/gcsClient.js";
import SupabaseCampaignAssetRepository from "../../persistence/supabase/SupabaseCampaignAssetRepository.js";
import SupabaseContextRetriever from "../../persistence/supabase/SupabaseContextRetriever.js";
import SharpImageAdapter from "../../external-services/image-processing/SharpImageAdapter.js"; // <-- NUEVO: Importamos el adaptador de Sharp

class GenerateImageController {
  constructor() {
    this.genAiClient = genAiClient;
    this.gcsClient = gcsClient;

    // Ensure we pass the bucket instance, not the storage client
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) {
      console.warn("ADVERTENCIA: GCS_BUCKET_NAME no está configurado en las variables de entorno.");
    }
    const bucket = this.gcsClient.bucket(bucketName);

    this.gcpStorageAdapter = new GcpStorageAdapter(bucket);
    this.geminiImageAdapter = new GeminiImageAdapter(this.genAiClient);
    this.campaignAssetRepository = new SupabaseCampaignAssetRepository();
    this.contextRetriever = new SupabaseContextRetriever();
    this.sharpImageAdapter = new SharpImageAdapter(); // <-- NUEVO: Instanciamos el adaptador

    this.generateImagesUseCase = new GenerateImagesUseCase(
      this.geminiImageAdapter,
      this.gcpStorageAdapter,
      this.campaignAssetRepository,
      this.contextRetriever,
      this.sharpImageAdapter // <-- NUEVO: Lo inyectamos al caso de uso
    );
    this.generateImage = this.generateImage.bind(this);
  }

  async generateImage(req, res) {
    try {
      // NUEVO: Agregamos methodToUse, referenceImageURLs y referenceType a la desestructuración
      const { prompt, numberOfImages, config, imageConfig, brandId, campaignId, style, methodToUse, referenceImageURLs, referenceType } = req.body;

      // Gemini SDK espera explícitamente el objeto "imageConfig" anidado dentro de "config"
      const generationConfig = {
        ...config,
      };
      if (imageConfig) {
        generationConfig.imageConfig = imageConfig;
      }

      const rawResults = await this.generateImagesUseCase.execute({
        prompt,
        numberOfImages,
        config: generationConfig,
        brandId,
        campaignId,
        style,
        methodToUse, // <-- NUEVO: Se lo pasamos al payload del caso de uso
        referenceImageURLs,
        referenceType
      });

      // Normalize for frontend: [{ id, img_url, prompt_used, campaign_id, status }]
      const assets = rawResults.map((item) => {
        const rawImgUrl = item.savedAsset?.img_url;
        let imgUrl = item.originalUrl;
        let thumbUrl = item.thumbnailUrl || null;

        if (rawImgUrl?.original) {
          imgUrl = rawImgUrl.original;
          thumbUrl = rawImgUrl.thumbnail || thumbUrl;
        }

        return {
          id: item.savedAsset?.id || item.assetId || null,
          img_url: imgUrl,
          thumbnail_url: thumbUrl,
          prompt_used: item.savedAsset?.prompt_used || prompt,
          campaign_id: campaignId,
          status: item.savedAsset?.status || "draft",
          parent_asset_id: item.savedAsset?.parent_asset_id || null,
        };
      });

      return res.status(200).json(assets);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

export default new GenerateImageController();