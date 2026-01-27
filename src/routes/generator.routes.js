/**
 * Rutas del Generador de Contenido (IA)
 * Define los endpoints para la orquestación de prompts y generación de imágenes.
 * Endpoint de generación de imágenes agregado.
 */

import { Remote } from "nicola-framework";
import GeneratorController from "../controllers/GeneratorController.js";
import { requireAuth } from "../middlewares/AuthMiddleware.js";

const router = new Remote();

/**
 * Construcción de Prompts
 * POST /generator/build-prompt
 * Construye un prompt optimizado para Gemini 2.5 Pro basado en un brief.
 */
router.post('/build-prompt', requireAuth, (req, res, next) => {
    // Usamos una arrow function para preservar el contexto 'this' del controlador
    GeneratorController.buildPrompt(req, res, next);
});

/**
 * Generación de Imágenes
 * POST /generator/generate-images
 * Genera imágenes usando Gemini Flash Image a partir de un prompt.
 * Body: { prompt, aspectRatio, sampleCount }
 */
router.post('/generate-images', requireAuth, (req, res, next) => {
    GeneratorController.generateImages(req, res, next);
});

export default router;