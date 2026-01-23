/**
 * ------------------------------------------------------------------
 * Archivo: testRoutes.js
 * Ubicación: src/routes/testRoutes.js
 * Responsabilidad: Definir rutas de diagnóstico y prueba.
 * ------------------------------------------------------------------
 */

import testPost from "../controllers/test.controller.js";
import vertexAdapter from "../services/vertexAdapter.js";
import { Remote } from "nicola-framework";

const testRoutes = new Remote();

/**
 * Endpoint: POST /test/test
 * Descripcion: Ruta de eco para verificar la recepción del body.
 */
testRoutes.post("/test", testPost);

/**
 * Endpoint: POST /test/image-generation
 * Descripcion: Generar imagenes con Vertex AI (Gemini)
 */
testRoutes.post("/image-generation", async (req, res) => {
    try {
        const { prompt, options } = req.body;
        const vertex = new vertexAdapter();
        const result = await vertex.imageGeneration(prompt, options || {});
        res.statusCode = 200;
        res.json(result);
    } catch (error) {
        console.error("Error generating image:", error);
        res.statusCode = 500;
        res.json({ error: error.message || "Failed to generate image" });
    }
});

export default testRoutes;
