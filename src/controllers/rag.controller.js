/**
 * ------------------------------------------------------------------
 * Archivo: RagController.js
 * Ubicación: src/controllers/RagController.js
 * Responsabilidad: Ingesta RAG de PDFs (manual de marca) y búsqueda vectorial.
 *
 * Flujo de Ingesta:
 * 1) Validación de archivo `manual` en multipart/form-data.
 * 2) Extracción de texto plano usando PdfService.
 * 3) División en chunks manejables (ChunkingService).
 * 4) Generación de embeddings para cada chunk (VectorCore).
 * 5) Persistencia de vectores y metadatos en BD (BrandManualVectorsModel).
 *
 * Notas de mantenibilidad:
 * - Requiere middleware de subida de archivos que popule `req.files`.
 * - Maneja errores de forma resiliente (cuenta fallos pero intenta completar).
 * ------------------------------------------------------------------
 */

import { chunkText } from "../services/ChunkingService.js";
import { extractTextFromPdf } from "../services/PdfService.js";
import VectorCore from "../services/VectorCore.js";
import BrandManualVectorsModel from "../model/brand_manual_vectors.model.js";
import { brand_manual_vectors } from "../services/QuerySearchServise.js";

/**
 * Endpoint: POST /rag/ingestManual
 * Descripción: Recibe un archivo PDF, lo procesa y guarda sus vectores para RAG.
 *
 * @param {Object} req - Objeto de solicitud Express. Espera `req.files.manual`.
 * @param {Object} res - Objeto de respuesta Express.
 */
const ingestManual = async (req, res) => {
  if (!req.files || !req.files.manual) {
    res.statusCode = 400;
    res.end("No se ha proporcionado ningun archivo");
    return;
  }

  // Extracción de texto del PDF
  const manual = await extractTextFromPdf(req.files.manual.data);

  if (!manual) {
    res.statusCode = 500;
    res.end("Error al procesar el archivo PDF");
    return;
  }

  let errorCount = 0;
  const chunks = chunkText(manual.fullText);

  // Procesamiento secuencial de chunks
  for (const c of chunks) {
    try {
      // Generar embedding (vector) para el chunk de texto
      const embedding = await VectorCore.embed(c);

      const vectorStr = JSON.stringify(embedding);

      // Guardar en la base de datos con metadata relevante
      await BrandManualVectorsModel.create({
        content_text: c,
        metadata: JSON.stringify({
          source: req.files.manual.name,
          type: req.files.manual.type,
          pages: manual.totalPages,
          info: JSON.stringify(manual.info),
        }),
        embedding: vectorStr,
      });
    } catch (e) {
      console.error("Error al generar el embedding: ", e);
      errorCount++;
      continue;
    }
  }

  res.statusCode = 200;
  if (errorCount > 0) {
    res.end(`Proceso completado con ${errorCount} errores`);
    return;
  }
  res.end("Proceso completado exitosamente");
  return;
};

/**
 * Endpoint: POST /rag/search (o similar)
 * Descripción: Realiza una búsqueda semántica sobre los vectores del manual de marca.
 *
 * @param {Object} req - Objeto de solicitud. Espera `req.body.query`.
 * @param {Object} res - Objeto de respuesta. Retorna array de textos coincidentes.
 */
const querySearch = async (req, res) => {
  const query = req.body.query;
  const match_threshold = 0.7; // Umbral de similitud mínima (0-1)
  const match_count = 5; // Número máximo de resultados a retornar

  if (query.length > 3) {
    try {
      // Convertir la query del usuario en un vector
      const embedding = await VectorCore.embed(query);
      const vectorStr = JSON.stringify(embedding);

      // Buscar vectores similares en la base de datos
      const data = await brand_manual_vectors(
        vectorStr,
        match_threshold,
        match_count,
      );

      if (typeof data === "undefined" || data.length === 0) {
        res.statusCode = 200;
        res.end("No se encontró información relevante");
        return;
      }

      // Formatear respuesta para enviar solo el texto
      const formatedData = data.map((item) => {
        return {
          content_text: item.content_text,
        };
      });

      res.statusCode = 200;
      res.end(JSON.stringify(formatedData));
      return;
    } catch (error) {
      res.statusCode = 500;
      res.end("Error al procesar la búsqueda");
    }
  } else {
    res.statusCode = 400;
    res.end("La consulta debe tener al menos 4 caracteres");
    return;
  }
};


const get_manual_vectors = async (req, res) => {
  const data = await BrandManualVectorsModel.select().get();
  res.statusCode = 200;
  res.end(JSON.stringify(data));
}

export { ingestManual, querySearch, get_manual_vectors };
