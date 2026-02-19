import GenerateImagesUseCase from "../../../application/use-cases/images/GenerateImagesUseCase.js";
import GcpStorageAdapter from "../../external-services/storage/GcpStorageAdapter.js";
import GeminiImageAdapter from "../../external-services/gemini/GeminiImageAdapter.js";
import genAiClient from "../../external-services/gemini/genAiClient.js";
import gcsClient from "../../external-services/storage/gcsClient.js";
import SupabaseCampaignAssetRepository from "../../persistence/supabase/SupabaseCampaignAssetRepository.js";
import SupabaseContextRetriever from "../../persistence/supabase/SupabaseContextRetriever.js";

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

    this.generateImagesUseCase = new GenerateImagesUseCase(
      this.geminiImageAdapter,
      this.gcpStorageAdapter,
      this.campaignAssetRepository,
      this.contextRetriever
    );
    this.generateImage = this.generateImage.bind(this);
  }

  async generateImage(req, res) {
    try {
      const { prompt, numberOfImages, config, brandId, campaignId, style } = req.body;
      const images = await this.generateImagesUseCase.execute({
        prompt,
        numberOfImages,
        config,
        brandId,
        campaignId,
        style
      });
      return res.status(200).json(images);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

export default new GenerateImageController();
