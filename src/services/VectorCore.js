/**
 * ------------------------------------------------------------------
 * Archivo: VectorCore.js
 * Ubicación: src/services/VectorCore.js
 * Responsabilidad: Generar embeddings usando Vertex AI.
 *
 * Requiere configuración en `src/config/index.js`.
 * ------------------------------------------------------------------
 */

import { VertexAI } from "@google-cloud/vertexai";

import config from "../config";

const vertexAI = new VertexAI({
  projectId: config.gcp.projectId,
  location: config.gcp.location,
  keyFile: config.gcp.keyFilePath,
});


class VectorCore{

    /**
     * Genera un vector de embedding para el texto recibido.
     * @param {string} text
     * @returns {Promise<number[]>}
     */
    static async embed(text){
        const model = vertexAI.getGenerativeModel({
            model: config.gcp.models.embedingModel
        });

        const result = await model.embedContent(text);

        return result.embedding.values;
    }
}

export default VectorCore;