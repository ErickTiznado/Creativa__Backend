import { Router } from "express";
import assetController from "../controllers/AssetController.js";

const router = Router();

router.get("/", assetController.getAssets);
router.post("/:assetId/approve", assetController.approveAsset);
router.delete("/:assetId", assetController.deleteAsset);

export default router;
