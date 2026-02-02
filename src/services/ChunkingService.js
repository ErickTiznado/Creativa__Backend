/**
 * ------------------------------------------------------------------
 * Archivo: ChunkingService.js
 * Ubicación: src/services/ChunkingService.js
 * Responsabilidad: Particionar texto largo en fragmentos para embeddings/RAG.
 *
 * Estrategia: separación simple por oraciones (". ") y acumulación hasta CHUNK_SIZE.
 * ------------------------------------------------------------------
 */

const CHUNK_SIZE = 1500;

/**
 * Divide el texto en chunks de tamaño aproximado `CHUNK_SIZE`.
 * @param {string} text
 * @returns {string[]}
 */
export function chunkText(text) {
    let sentences = [];
    let finalChunks = [];
    let actualChunk = '';

    const normalizedText = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    if (!normalizedText) return [];

    sentences = normalizedText.split(". ")
    for (const s of sentences) {
        const newS = s + ". "
        if (actualChunk.length + newS.length > CHUNK_SIZE) {
            finalChunks.push(actualChunk.trim())
            actualChunk = newS
        }
        else {
            actualChunk += newS
        }
    }
    if (actualChunk.length > 0) {
        finalChunks.push(actualChunk.trim())
    }

    return finalChunks;
}