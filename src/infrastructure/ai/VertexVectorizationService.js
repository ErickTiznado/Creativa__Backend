import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';
import supabase from '../persistence/supabase/supabaseClient.js';
import 'dotenv/config';

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const LOCATION = process.env.GOOGLE_LOCATION || 'us-central1';
const EMBEDDING_MODEL = 'text-embedding-004';

class VertexVectorizationService {
    constructor() {
        if (!PROJECT_ID) {
            console.error("[VertexVectorizationService] ⚠️ Falta GOOGLE_PROJECT_ID en el .env");
        }

        const clientOptions = {
            apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`,
            projectId: PROJECT_ID,
        };

        if (process.env.GOOGLE_CREDS_JSON) {
            try {
                clientOptions.credentials = JSON.parse(process.env.GOOGLE_CREDS_JSON);
            } catch (e) {
                console.error("[VertexVectorizationService] Error al parsear GOOGLE_CREDS_JSON:", e);
            }
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            clientOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        }

        this.predictionClient = new PredictionServiceClient(clientOptions);
    }

    // --- Método Privado: genera embedding con task_type configurable ---
    async _generateEmbedding(text, taskType = "RETRIEVAL_DOCUMENT") {
        const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${EMBEDDING_MODEL}`;

        const instance = helpers.toValue({
            content: text,
            task_type: taskType
        });

        const request = {
            endpoint,
            instances: [instance],
        };

        // 🚨 CORRECCIÓN: Le damos 60 segundos de paciencia a la conexión
        const callOptions = {
            timeout: 60000 
        };

        const [response] = await this.predictionClient.predict(request, callOptions);
        const predictions = response.predictions;

        if (!predictions || predictions.length === 0) {
            throw new Error("No se obtuvo embedding del modelo de Vertex AI");
        }

        // 2. CORRECCIÓN: Extraer usando 'embeddings' (formato de text-embedding-004)
        const embeddingsProto = predictions[0].structValue.fields.embeddings;
        const valuesProto = embeddingsProto.structValue.fields.values;

        // Convertir a array de números
        return valuesProto.listValue.values.map((v) => Number(v.numberValue));
    }

    // --- Genera embedding para una consulta de búsqueda (RETRIEVAL_QUERY) ---
    async generateQueryEmbedding(text) {
        return this._generateEmbedding(text, "RETRIEVAL_QUERY");
    }

    // --- Vectoriza un asset y lo guarda en campaign_asset_vectors ---
    async vectorizeAsset(assetId, promptUsed) {
        try {
            if (!promptUsed?.trim()) {
                console.warn(`[VertexVectorizationService] Sin prompt para asset ${assetId}`);
                return;
            }

            const embedding = await this._generateEmbedding(promptUsed, "RETRIEVAL_DOCUMENT");

            const { data: existing, error: selectError } = await supabase
                .from('campaign_asset_vectors')
                .select('id')
                .eq('asset_id', assetId)
                .maybeSingle();

            if (selectError) throw selectError;

            if (existing) {
                const { error: updateError } = await supabase
                    .from('campaign_asset_vectors')
                    .update({ embedding, prompt_used: promptUsed })
                    .eq('id', existing.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('campaign_asset_vectors')
                    .insert([{ asset_id: assetId, embedding, prompt_used: promptUsed }]);
                if (insertError) throw insertError;
            }

            console.log(`[VertexVectorizationService] Vector de asset ${assetId} guardado`);
        } catch (error) {
            console.error(`[VertexVectorizationService] Error vectorizando asset ${assetId}:`, error);
        }
    }

    // --- Método del Puerto: El que llama tu Caso de Uso ---
    async vectorizeCampaign(campaignId, briefData) {
        try {
            if (!briefData) {
                console.warn(`[VertexVectorizationService] Sin datos de brief para la campaña ${campaignId}`);
                return;
            }

            // 1. Concatenar campos
            const parts = [];
            if (briefData.nombre_campaing) parts.push(`Nombre: ${briefData.nombre_campaing}`);
            if (briefData.Objective) parts.push(`Objetivo: ${briefData.Objective}`);
            if (briefData.Description) parts.push(`Descripción: ${briefData.Description}`);
            if (briefData.observations) parts.push(`Observaciones: ${briefData.observations}`);
            if (briefData.ContentType) parts.push(`Tipo de Contenido: ${briefData.ContentType}`);

            const textToVectorize = parts.join("\n");

            if (!textToVectorize.trim()) {
                console.warn(`[VertexVectorizationService] Texto vacío para la campaña ${campaignId}`);
                return;
            }

            console.log(`[VertexVectorizationService] Conectando a Vertex AI para vectorizar campaña ${campaignId}...`);

            // 2. Generar embedding usando nuestro método privado
            const embedding = await this._generateEmbedding(textToVectorize);

            // 3. Guardar en Supabase
            const { data: existing, error: searchError } = await supabase
                .schema('devschema_test')
                .from('campaign_vectors')
                .select('id')
                .eq('campaign_id', campaignId);

            if (searchError) throw searchError;

            if (existing && existing.length > 0) {
                await supabase
                    .schema('devschema_test')
                    .from('campaign_vectors')
                    .update({ embedding: embedding, text_content: textToVectorize })
                    .eq('id', existing[0].id);
                console.log(`[VertexVectorizationService] Vector actualizado en BD para campaña ${campaignId}`);
            } else {
                await supabase
                    .schema('devschema_test')
                    .from('campaign_vectors')
                    .insert([{
                        campaign_id: campaignId,
                        embedding: embedding,
                        text_content: textToVectorize
                    }]);
                console.log(`[VertexVectorizationService] Vector creado exitosamente en BD para campaña ${campaignId}`);
            }

        } catch (error) {
            console.error(`[VertexVectorizationService] Error crítico vectorizando campaña ${campaignId}:`, error);
        }
    }
}

export default VertexVectorizationService;
