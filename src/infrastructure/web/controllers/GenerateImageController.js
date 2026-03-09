import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import GenerateImagesUseCase from "../../../application/use-cases/images/GenerateImagesUseCase.js";
import GcpStorageAdapter from "../../external-services/storage/GcpStorageAdapter.js";
import GeminiImageAdapter from "../../external-services/gemini/GeminiImageAdapter.js";
import genAiClient from "../../external-services/gemini/genAiClient.js";
import gcsClient from "../../external-services/storage/gcsClient.js";
import SupabaseCampaignAssetRepository from "../../persistence/supabase/SupabaseCampaignAssetRepository.js";
import SupabaseContextRetriever from "../../persistence/supabase/SupabaseContextRetriever.js";
import SharpImageAdapter from "../../external-services/image-processing/SharpImageAdapter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GenerateImageController {
  constructor() {
    this.genAiClient = genAiClient;
    this.gcsClient = gcsClient;

    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) {
      console.warn("ADVERTENCIA: GCS_BUCKET_NAME no está configurado en las variables de entorno.");
    }
    const bucket = this.gcsClient.bucket(bucketName);

    this.gcpStorageAdapter = new GcpStorageAdapter(bucket);
    this.geminiImageAdapter = new GeminiImageAdapter(this.genAiClient);
    this.campaignAssetRepository = new SupabaseCampaignAssetRepository();
    this.contextRetriever = new SupabaseContextRetriever();

    // --- CAMBIO v2.0: Ahora le pasamos la RUTA de la carpeta, no los buffers quemados ---
    // Así SharpImageAdapter puede buscar dinámicamente el logo de Visible o Creativa
    const referencesPath = path.join(__dirname, '../../../references/');
    this.sharpImageAdapter = new SharpImageAdapter(referencesPath); 
    // ------------------------------------------------------------------------

    this.generateImagesUseCase = new GenerateImagesUseCase(
      this.geminiImageAdapter,
      this.gcpStorageAdapter,
      this.campaignAssetRepository,
      this.contextRetriever,
      this.sharpImageAdapter
    );
    this.generateImage = this.generateImage.bind(this);
  }

async generateImage(req, res) {
  try {
    console.log("=== PAYLOAD QUE MANDA MARLON ===", req.body); 
      const { 
        prompt, numberOfImages, config, imageConfig, brandId, campaignId, 
        style, methodToUse, referenceImageURLs, referenceType,
        resolution, logoType
      } = req.body;

      const generationConfig = { ...config };
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
        methodToUse, 
        referenceImageURLs,
        referenceType,
        resolution, // NUEVO
        logoType    // NUEVO
      });

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