import EditImagesUseCase from "../../../application/use-cases/images/EditImagesUseCase.js";
import GcpStorageAdapter from "../../external-services/storage/GcpStorageAdapter.js";
import GeminiImageAdapter from "../../external-services/gemini/GeminiImageAdapter.js";
import genAiClient from "../../external-services/gemini/genAiClient.js";
import gcsClient from "../../external-services/storage/gcsClient.js";
import SupabaseCampaignAssetRepository from "../../persistence/supabase/SupabaseCampaignAssetRepository.js";
import SupabaseContextRetriever from "../../persistence/supabase/SupabaseContextRetriever.js";

class EditImageController {
  constructor() {
    this.genAiClient = genAiClient;
    this.gcsClient = gcsClient;
    
    const bucketName = process.env.GCS_BUCKET_NAME;
    const bucket = this.gcsClient.bucket(bucketName);
    
    this.gcpStorageAdapter = new GcpStorageAdapter(bucket);
    this.geminiImageAdapter = new GeminiImageAdapter(this.genAiClient);
    this.campaignAssetRepository = new SupabaseCampaignAssetRepository();
    this.contextRetriever = new SupabaseContextRetriever();

    this.editImagesUseCase = new EditImagesUseCase(
      this.geminiImageAdapter,
      this.gcpStorageAdapter,
      this.campaignAssetRepository,
      this.contextRetriever
    );
    this.editImage = this.editImage.bind(this);
  }

  async editImage(req, res) {
    try {
      const { 
        baseImageURL, 
        maskImageURL, 
        prompt, 
        numberOfImages, 
        config, 
        brandId, 
        campaignId, 
        style, 
        context 
      } = req.body;

      const images = await this.editImagesUseCase.execute({
        baseImageURL,
        maskImageURL,
        prompt,
        numberOfImages,
        config,
        brandId,
        campaignId,
        style,
        context
      });
      return res.status(200).json(images);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

export default new EditImageController();
