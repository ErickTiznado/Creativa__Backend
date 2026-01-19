/**
 * ------------------------------------------------------------------
 * Archivo: RagController.js
 * Ubicación: src/controllers/RagController.js
 * Responsabilidad: Ingesta RAG de PDFs (manual de marca).
 *
 * Flujo:
 * 1) Validación de archivo `manual` en multipart
 * 2) Extracción de texto (PdfService)
 * 3) Chunking (ChunkingService)
 * 4) Embeddings (VectorCore)
 * 5) Persistencia (BrandManualVectorsModel)
 *
 * Notas de mantenibilidad:
 * - Requiere middleware de subida de archivos que exponga `req.files`.
 * - Import paths con casing incorrecto pueden fallar en Linux.
 * ------------------------------------------------------------------
 */

import { chunkText } from "../services/ChunkingService.js";
import { extractTextFromPdf } from "../services/PdfService.js";
import VectorCore from "../services/VectorCore.js";
import BrandManualVectorsModel from "../model/brand_manual_vectors.model.js";
import { magent } from 'nicola-framework'
import { brand_manual_vectors } from "../services/QuerySearchServise.js";

const ingestManual = async (req, res) => {
    /**
     * Endpoint: POST /rag/ingestManual
     * Espera `multipart/form-data` con `manual`.
     */
    if (!req.files || !req.files.manual) {
        res.statusCode = 400
        res.end("No se ha proporcionado ningun archivo");
        return;
    }

    const manual = await extractTextFromPdf(req.files.manual.data);

    if (!manual) {
        res.statusCode = 500
        res.end("Error al procesar el archivo PDF");
        return;
    }
    let errorCount = 0;
    const chunks = chunkText(manual.fullText);

    for (const c of chunks) {
        try {
            const embedding = await VectorCore.embed(c);

            const vectorStr = JSON.stringify(embedding);

            await BrandManualVectorsModel.create({
                content_text: c,
                metadata: JSON.stringify({
                    source: req.files.manual.name,
                    type: req.files.manual.type,
                    pages: manual.totalPages,
                    info: JSON.stringify(manual.info)
                }),
                embedding: vectorStr
            });

        }
        catch (e) {
            console.error("Error al generar el embedding: ", e);
            errorCount++;
            continue;
        }
    }

    res.statusCode = 200
    if (errorCount > 0) {
        res.end(`Proceso completado con ${errorCount} errores`);
        return;
    }
    res.end("Proceso completado exitosamente");
    return;
}


const querySearch = async (req, res) => {
    const query = req.body.query;
    const match_threshold = 0.7;
    const match_count = 5;
    if (query.length > 3) {
        try {

            const embedding = await VectorCore.embed(query)

            const vectorStr = JSON.stringify(embedding)
            const data = await brand_manual_vectors(vectorStr, match_threshold, match_count)
            if (data.length > 0) {
                res.statusCode = 200
                res.end("No se encontro informacion relevante")
                return
            }
            const formatedData = data.map((item) => {
                return {
                    content_text: item.content_text,
                }
            })

            res.statusCode = 200
            res.end(JSON.stringify(formatedData))
            return
        } catch (e) {
            console.log(e)
        }
    }
    else {
        res.statusCode = 400
        res.end("La consulta debe tener al menos 4 caracteres")
        return;
    }
}

export {
    ingestManual,
    querySearch
}