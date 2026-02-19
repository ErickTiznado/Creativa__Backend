import { Router } from "express";
import generateImageController from "../controllers/GenerateImageController.js";
import editImageController from "../controllers/EditImageController.js";

const router = Router();

router.post("/generate", generateImageController.generateImage);
router.post("/edit", editImageController.editImage);

export default router;
