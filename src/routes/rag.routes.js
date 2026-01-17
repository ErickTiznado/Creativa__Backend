/**
 * ------------------------------------------------------------------
 * Archivo: rag.routes.js
 * Ubicación: src/routes/rag.routes.js
 * Responsabilidad: Endpoints del módulo RAG (ingesta de manuales).
 *
 * Endpoints:
 * - POST /rag/ingestManual: recibe un PDF, extrae texto, chunking, embeddings y persistencia
 * ------------------------------------------------------------------
 */

import { ingestManual } from "../controllers/RagController";
import { Remote } from "nicola-framework";

const RagRoute = new Remote();

RagRoute.post('/ingestManual', ingestManual);

export default RagRoute;