import ApproveAssetUseCase from "../../../application/use-cases/assets/ApproveAssetUseCase.js";
import DeleteAssetUseCase from "../../../application/use-cases/assets/DeleteAssetUseCase.js";
import GetAssetsUseCase from "../../../application/use-cases/assets/GetAssetsUseCase.js";
import GcpStorageAdapter from "../../external-services/storage/GcpStorageAdapter.js";
import SupabaseCampaignAssetRepository from "../../persistence/supabase/SupabaseCampaignAssetRepository.js";
import VertexVectorizationService from "../../ai/VertexVectorizationService.js";
import gcsClient from "../../external-services/storage/gcsClient.js";

class AssetController {
    constructor() {
        this.gcsClient = gcsClient;
        const bucketName = process.env.GCS_BUCKET_NAME;
        const bucket = this.gcsClient.bucket(bucketName);

        this.gcpStorageAdapter = new GcpStorageAdapter(bucket);
        this.campaignAssetRepository = new SupabaseCampaignAssetRepository(new VertexVectorizationService());

        this.approveAssetUseCase = new ApproveAssetUseCase(this.gcpStorageAdapter, this.campaignAssetRepository);
        this.deleteAssetUseCase = new DeleteAssetUseCase(this.gcpStorageAdapter, this.campaignAssetRepository);
        this.getAssetsUseCase = new GetAssetsUseCase(this.campaignAssetRepository);

        this.approveAsset = this.approveAsset.bind(this);
        this.deleteAsset = this.deleteAsset.bind(this);
        this.getAssets = this.getAssets.bind(this);
    }

    async getAssets(req, res) {
        try {
            const { campaign_id } = req.query;
            if (!campaign_id) {
                return res.status(400).json({ error: "campaign_id query parameter is required." });
            }
            const assets = await this.getAssetsUseCase.execute(campaign_id);

            // Normalize img_url: DB stores { asset_urls: ["url1", ...] }
            // Frontend expects a plain string URL
            const normalized = assets.map((asset) => {
                let imgUrl = asset.img_url;
                let thumbUrl = null;

                if (typeof imgUrl !== "string") {
                    if (imgUrl?.original) {
                        thumbUrl = imgUrl.thumbnail || null;
                        imgUrl = imgUrl.original;
                    } else {
                        imgUrl = null;
                    }
                }
                return { ...asset, img_url: imgUrl, thumbnail_url: thumbUrl };
            });

            return res.status(200).json({ success: true, data: normalized });
        } catch (error) {
            console.error("Error fetching assets:", error);
            return res.status(500).json({ error: error.message });
        }
    }

    async approveAsset(req, res) {
        try {
            const { assetId } = req.params;
            if (!assetId) {
                return res.status(400).json({ error: "Asset ID is required." });
            }

            const result = await this.approveAssetUseCase.execute(assetId);
            return res.status(200).json(result);
        } catch (error) {
            console.error("Falló la aprobación del asset:", error);
            // Distinguish between Not Found and other errors if possible
            if (error.message.includes("not found")) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: error.message });
        }
    }

    async deleteAsset(req, res) {
        try {
            const { assetId } = req.params;
            if (!assetId) {
                return res.status(400).json({ error: "Asset ID is required." });
            }

            const result = await this.deleteAssetUseCase.execute(assetId);
            return res.status(200).json(result);
        } catch (error) {
            console.error("Falló la eliminación del asset:", error);
            if (error.message.includes("not found")) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: error.message });
        }
    }
}

export default new AssetController();
