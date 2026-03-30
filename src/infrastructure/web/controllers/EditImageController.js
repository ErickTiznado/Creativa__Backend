import path from 'path';
import { fileURLToPath } from 'url';
import EditImagesUseCase from "../../../application/use-cases/images/EditImagesUseCase.js";
import GcpStorageAdapter from "../../external-services/storage/GcpStorageAdapter.js";
import GeminiImageAdapter from "../../external-services/gemini/GeminiImageAdapter.js";
import genAiClient from "../../external-services/gemini/genAiClient.js";
import gcsClient from "../../external-services/storage/gcsClient.js";
import SupabaseCampaignAssetRepository from "../../persistence/supabase/SupabaseCampaignAssetRepository.js";
import SupabaseContextRetriever from "../../persistence/supabase/SupabaseContextRetriever.js";
import SharpImageAdapter from "../../external-services/image-processing/SharpImageAdapter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    // --- CAMBIO V2.0: Inyectamos SharpImageAdapter en el modo Edición ---
    const referencesPath = path.join(__dirname, '../../../references/');
    this.sharpImageAdapter = new SharpImageAdapter(referencesPath);

    this.editImagesUseCase = new EditImagesUseCase(
      this.geminiImageAdapter,
      this.gcpStorageAdapter,
      this.campaignAssetRepository,
      this.contextRetriever,
      this.sharpImageAdapter // Pasamos el puerto al UseCase
    );
    this.editImage = this.editImage.bind(this);
  }

  async editImage(req, res) {
    try {
      let {
        baseImageURL,
        maskImageURL,
        prompt,
        numberOfImages,
        config,
        imageConfig,
        brandId,
        campaignId,
        style,
        context,
        // Frontend may send these instead:
        assetId,
        maskImage,
        logoType,      // CAMBIO V2.0
        resolution,    // Para resize post-generación
        aspectRatio,   // Aspect ratio explícito del frontend
      } = req.body;

      // If frontend sends assetId instead of baseImageURL, look up the URL
      if (assetId && !baseImageURL) {
        try {
          const asset = await this.campaignAssetRepository.findById(assetId);
          if (!asset) {
            return res.status(404).json({ error: `Asset ${assetId} not found` });
          }
          // DB stores img_url as { asset_urls: ["url1", ...] } or as a plain string
          const imgUrl = asset.img_url;
          if (typeof imgUrl === "string") {
            baseImageURL = imgUrl;
          } else if (imgUrl?.original) {
            baseImageURL = imgUrl.original;
          } else {
            return res.status(400).json({ error: "Could not extract image URL from asset" });
          }

          // Inherit campaignId from asset if not provided
          if (!campaignId) campaignId = asset.campaign_id || asset.campaign_assets;
        } catch (lookupError) {
          return res.status(404).json({ error: `Could not find asset: ${lookupError.message}` });
        }
      }

      // If frontend sends maskImage as base64 data URL, use it directly
      // If no mask provided (refine mode), send null — use case handles it
      if (maskImage && !maskImageURL) {
        maskImageURL = maskImage;
      }

      if (!baseImageURL) {
        return res.status(400).json({ error: "baseImageURL or assetId is required" });
      }

      // Gemini SDK espera explícitamente el objeto "imageConfig" anidado dentro de "config"
      const editConfig = {
        ...config,
      };
      if (imageConfig) {
        editConfig.imageConfig = imageConfig;
      }

      // Normalizar aspectRatio: puede venir de varias formas según el frontend.
      // El frontend manda { config: { aspectRatio: '9:16' } } como campo directo en config.
      const resolvedAspectRatio =
        aspectRatio ||              // campo directo en el body
        imageConfig?.aspectRatio || // dentro de imageConfig separado
        config?.aspectRatio ||      // ← ASÍ lo manda el frontend (config.aspectRatio)
        config?.imageConfig?.aspectRatio || // anidado en imageConfig dentro de config
        '1:1';

      // Resolver resolución: el frontend no la manda, derivarla del aspectRatio
      const resolvedResolution = resolution || '2K';

      // Asegurar que también viaje dentro de editConfig.imageConfig para que Gemini lo reciba
      if (resolvedAspectRatio && resolvedAspectRatio !== '1:1') {
        editConfig.imageConfig = {
          ...(editConfig.imageConfig || {}),
          aspectRatio: resolvedAspectRatio,
        };
      }

      const rawResults = await this.editImagesUseCase.execute({
        baseImageURL,
        maskImageURL: maskImageURL || null,
        prompt,
        numberOfImages,
        config: editConfig,
        brandId,
        campaignId,
        style,
        context,
        assetId: assetId || null,
        logoType: logoType || 'Ninguno',
        resolution: resolvedResolution,
        aspectRatio: resolvedAspectRatio,
      });

      // Normalize for frontend: [{ id, img_url, prompt_used, campaign_id, status, parent_asset_id }]
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
          parent_asset_id: assetId || null,
        };
      });

      return res.status(200).json(assets);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

export default new EditImageController();