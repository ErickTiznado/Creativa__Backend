import axios from "axios";
import VectorCore from "./VectorCore.js";

/**
 * Service for RAG (Retrieval-Augmented Generation) operations.
 * Handles fetching contexts, manual vectors, and similarity calculations.
 */
class RagService {
    /**
     * Retrieves context for the prompt based on brand ID and brief.
     * Uses RAG (Retrieval Augmented Generation) with fallback.
     *
     * @param {string} brandId - The brand identifier
     * @param {string} brief - The user brief
     * @param {string} requestId - Request ID for logging
     * @returns {Promise<Object>} Context object with source, relevanceScore, and data
     */
    async getContext(brandId, brief, requestId) {
        try {
            console.log(`[RagService:${requestId}] Obteniendo vectores vía API...`);

            // 1. Obtener todos los manuales de la API
            const PORT = process.env.PORT || 3000;
            // Ajuste: usar URL completa correcta si es diferente en producción, 
            // pero mantenemos localhost por consistencia con el código original.
            const apiUrl = `http://localhost:${PORT}/rag/getManualVectors`;

            let allVectors = [];
            try {
                const { data } = await axios.get(apiUrl);
                allVectors = data;
            } catch (apiError) {
                console.warn(`[RagService:${requestId}] Error contactando API RAG: ${apiError.message}`);
                return this.getGenericBrandContext(brandId);
            }

            if (!allVectors || !Array.isArray(allVectors) || allVectors.length === 0) {
                console.warn(`[RagService:${requestId}] API retorno lista vacía.`);
                return this.getGenericBrandContext(brandId);
            }

            // 2. Vectorizar el brief actual
            // Asumimos que VectorCore.embed devuelve number[]
            const briefEmbedding = await VectorCore.embed(brief);

            // 3. Filtrar y buscar similitud en memoria
            // El usuario indicó que los manuales son globales, no filtramos por brandId.
            const candidates = allVectors;

            if (candidates.length === 0) {
                console.warn(`[RagService:${requestId}] No se encontraron manuales (Global).`);
                return this.getGenericBrandContext(brandId);
            }

            // Calcular similitud coseno
            const scoredCandidates = candidates
                .map((item) => {
                    let itemEmbedding = item.embedding;
                    if (typeof itemEmbedding === "string") {
                        try {
                            itemEmbedding = JSON.parse(itemEmbedding);
                        } catch (e) {
                            return null;
                        }
                    }

                    if (!Array.isArray(itemEmbedding)) return null;

                    const score = this._cosineSimilarity(briefEmbedding, itemEmbedding);
                    return { ...item, score };
                })
                .filter((item) => item !== null);

            // Ordenar por similitud descendente
            scoredCandidates.sort((a, b) => b.score - a.score);

            // Tomar los top 3
            const topResults = scoredCandidates.slice(0, 3);

            if (topResults.length > 0) {
                return {
                    source: "rag_api",
                    relevanceScore: topResults[0].score, // Score del mejor match
                    data: this.formatRagResults(topResults),
                };
            }

            return this.getGenericBrandContext(brandId);
        } catch (e) {
            console.warn(`[RagService:${requestId}] RAG API Error: ${e.message}`);
            return this.getGenericBrandContext(brandId);
        }
    }

    /**
     * Calculates cosine similarity between two vectors.
     * @param {number[]} vecA 
     * @param {number[]} vecB 
     * @returns {number} Similarity score (-1 to 1)
     */
    _cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Formats RAG results for the prompt builder.
     * @param {Array} results 
     * @returns {Object} Formatted data
     */
    formatRagResults(results) {
        return {
            guidelines: results.map((r) => r.content).slice(0, 5),
        };
    }

    /**
     * Returns a generic fallback context for a brand.
     * @param {string} brandId 
     * @returns {Object} Generic context
     */
    getGenericBrandContext(brandId) {
        return {
            source: "fallback",
            relevanceScore: 0,
            data: {
                colors: { primary: "#000000", secondary: "#FFFFFF" },
                typography: { heading: "Sans-serif", body: "Sans-serif" },
                visualStyle: "Professional",
                guidelines: ["Maintain brand consistency"],
            },
        };
    }
}

export default new RagService();
