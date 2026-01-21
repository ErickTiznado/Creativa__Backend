/**
 * ------------------------------------------------------------------
 * Archivo: testRoutes.js
 * Ubicación: src/routes/testRoutes.js
 * Responsabilidad: Definir rutas de diagnóstico y prueba.
 * ------------------------------------------------------------------
 */

import testPost from "../controllers/test.controller.js";
import { Remote } from "nicola-framework";

const testRoutes = new Remote();

/**
 * Endpoint: POST /test/test
 * Descripcion: Ruta de eco para verificar la recepción del body.
 */
testRoutes.post("/test", testPost);

export default testRoutes;
