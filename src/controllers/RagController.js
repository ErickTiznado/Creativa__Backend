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

const ingestManual = async (req, res) => {
    /**
     * Endpoint: POST /rag/ingestManual
     * Espera `multipart/form-data` con `manual`.
     */
    if(!req.files || !req.files.manual){
        res.statusCode = 400
        res.end("No se ha proporcionado ningun archivo");
        return;
    }

    const manual = await extractTextFromPdf(req.files.manual.data);

    if(!manual){
        res.statusCode = 500
        res.end("Error al procesar el archivo PDF");
        return;
    }
    let errorCount = 0;
    const chunks = chunkText(manual.fullText);

    for(const c of chunks){
        try{
            const embedding =  await VectorCore.embed(c);

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
        catch(e){
            console.error("Error al generar el embedding: ", e);
            errorCount++;
            continue;
        }
    }

    res.statusCode= 200
    if(errorCount > 0){
        res.end(`Proceso completado con ${errorCount} errores`);
        return;
    }
    res.end("Proceso completado exitosamente");
    return;
}

export {
    ingestManual
}