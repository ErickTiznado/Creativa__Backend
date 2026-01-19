/**
 * ------------------------------------------------------------------
 * Archivo: VectorCore.js
 * Ubicación: src/services/VectorCore.js
 * Responsabilidad: Generar embeddings usando Vertex AI.
 * ------------------------------------------------------------------
 */

import aiplatform from '@google-cloud/aiplatform';
import config from "../config/index.js";

const { PredictionServiceClient } = aiplatform.v1;
const { helpers } = aiplatform;

const clientOptions = {
    apiEndpoint: `${config.gcp.location}-aiplatform.googleapis.com`,
    keyFilename: config.gcp.keyFilePath
};

class VectorCore {

    /**
     * Genera un vector de embedding para el texto recibido.
     * @param {string} text
     * @returns {Promise<number[]>}
     */
    static async embed(text) {
        const client = new PredictionServiceClient(clientOptions);
        
        const endpoint = `projects/${config.gcp.projectId}/locations/${config.gcp.location}/publishers/google/models/${config.gcp.models.embedingModel}`;
        
        // Construir la instancia con helpers.toValue
        const instance = helpers.toValue({
            content: text,
            task_type: 'RETRIEVAL_DOCUMENT'
        });
        
        const request = {
            endpoint,
            instances: [instance]
        };

        const [response] = await client.predict(request);
        const predictions = response.predictions;

        if (!predictions || predictions.length === 0) {
            throw new Error('No se obtuvo embedding del modelo');
        }

        // Extraer embeddings del formato protobuf
        const embeddingsProto = predictions[0].structValue.fields.embeddings;
        const valuesProto = embeddingsProto.structValue.fields.values;
        const embeddings = valuesProto.listValue.values.map(v => v.numberValue);

        return embeddings;
    }
}

export default VectorCore;