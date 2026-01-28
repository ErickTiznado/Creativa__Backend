/**
 * ------------------------------------------------------------------
 * Archivo: rag.routes.js
 * Ubicación: src/routes/rag.routes.js
 * Responsabilidad: Endpoints del módulo RAG (ingesta de manuales).
 *
 * Endpoints:
 * - POST /rag/ingestManual: Recibe PDF, extrae texto, chunking, embeddings y persistencia.
 * - POST /rag/query: Realiza búsqueda semántica en los vectores del manual.
 * ------------------------------------------------------------------
 */

import { ingestManual, querySearch, get_manual_vectors } from "../controllers/rag.controller.js";
import { Remote } from "nicola-framework";

const RagRoute = new Remote();

// Ingesta de manuales (Subida de PDF)
RagRoute.post("/ingestManual", ingestManual);

// Búsqueda semántica (Query)
RagRoute.post("/query", querySearch);

// Obteniendo vectores de manuales
RagRoute.get("/getManualVectors", get_manual_vectors);

export default RagRoute;
