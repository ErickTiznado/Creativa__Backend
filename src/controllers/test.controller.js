/**
 * ------------------------------------------------------------------
 * Archivo: testController.js
 * Ubicación: src/controllers/testController.js
 * Responsabilidad: Controlador de prueba para verificar recepción de datos.
 * ------------------------------------------------------------------
 */

/**
 * Endpoint: POST /test
 * Descripción: Hace eco de los datos recibidos para debug.
 *
 * @param {Object} req - Request. Se imprimen los datos de body.
 * @param {Object} res - Response. Devuelve los mismos datos en JSON.
 */
const testPost = (req, res) => {
  const data = req.body;
  res.json({
    message: "Post Exitoso",
    data: JSON.stringify(data),
  });
};

export default testPost;
