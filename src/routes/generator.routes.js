/**
 * Rutas del Generador de Contenido (IA)
 * Define los endpoints para la orquestación de prompts y generación de imágenes.
 */

import { Remote } from "nicola-framework";
import GeneratorController from "../controllers/GeneratorController.js";
import { requireAuth } from "../middlewares/AuthMiddleware.js";

const router = new Remote();

/**
 * Construcción de Prompts
 * POST /generator/build-prompt
 */
router.post('/build-prompt', requireAuth, (req, res, next) => {
    GeneratorController.buildPrompt(req, res, next);
});

/**
 * Generación de Imágenes
 * POST /generator/generate-images
 */
router.post('/generate-images', requireAuth, (req, res, next) => {
    GeneratorController.generateImages(req, res, next);
});

/**
 * Guardar Assets (Subida Manual)
 * POST /generator/save-assets
 */
router.post('/save-assets', requireAuth, (req, res, next) => {
    GeneratorController.saveToStorage(req, res, next);
});

/**
 * Refinamiento Multimodal
 * POST /generator/refine-asset
 */
router.post('/refine-asset', requireAuth, (req, res, next) => {
    GeneratorController.refineAsset(req, res, next);
});

export default router;