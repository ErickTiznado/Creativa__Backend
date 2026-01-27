/**
 * ------------------------------------------------------------------
 * Archivo: VectorCore.js
 * Ubicación: src/services/VectorCore.js
 * Responsabilidad: Generar embeddings usando Vertex AI.
 * ------------------------------------------------------------------
 */

import aiplatform from '@google-cloud/aiplatform';
import path from "path";
import { fileURLToPath } from "url";

// --- CONFIGURACIÓN DIRECTA (Sin importar archivos externos rotos) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta a la llave JSON
const KEY_PATH = path.join(__dirname, "../../config/key/creativa-key.json");

// Variables de entorno o valores por defecto
const PROJECT_ID = process.env.GCP_PROJECT_ID || "ugb-creativamkt";
const LOCATION = "us-central1";
const EMBEDDING_MODEL = "text-embedding-004";

const { PredictionServiceClient } = aiplatform.v1;
const { helpers } = aiplatform;

// Configuración del cliente usando las variables locales
const clientOptions = {
    apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`,
    keyFilename: KEY_PATH,
    projectId: PROJECT_ID
};

class VectorCore {

    /**
     * Genera un vector de embedding para el texto recibido.
     * @param {string} text
     * @returns {Promise<number[]>}
     */
    static async embed(text) {
        // Instanciamos el cliente con las opciones seguras
        const client = new PredictionServiceClient(clientOptions);

        const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${EMBEDDING_MODEL}`;

        // Construir la instancia
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
        // Convertir a array de números
        const embeddings = valuesProto.listValue.values.map(v => v.numberValue);

        return embeddings;
    }
}

export default VectorCore;