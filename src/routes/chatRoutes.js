/**
 * ------------------------------------------------------------------
 * Archivo: chatRoutes.js
 * Ubicación: src/routes/chatRoutes.js
 * Responsabilidad: Definir endpoints del módulo IA/Brief.
 *
 * Endpoints:
 * - POST /ai/chat: conversación para recolectar datos del brief
 * - POST /ai/createCampaing: persiste el brief/campaña en Supabase
 *
 * Exporta: router (Remote) para ser montado en app.js.
 * ------------------------------------------------------------------
 */

import { Remote } from "nicola-framework";
import handleChat from "../controllers/BriefChatController.js";
import { brief_DB } from "../controllers/Brief_BD_save.js";

const RemoteRoute = new Remote()


RemoteRoute.post('/chat', handleChat)
RemoteRoute.post("/createCampaing", brief_DB.Registrar_Brief);
export default RemoteRoute