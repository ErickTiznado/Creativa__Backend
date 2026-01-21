/**
 * ------------------------------------------------------------------
 * Archivo: chatRoutes.js
 * Ubicación: src/routes/chatRoutes.js
 * Responsabilidad: Definir endpoints del módulo IA/Brief para chat conversacional
 * y gestión de campañas.
 *
 * Endpoints disponibles:
 * - POST /ai/chat: Inicia/continúa conversación para recolectar datos del brief
 * - POST /ai/createCampaing: Crea una nueva campaña vacía para un usuario
 * - POST /ai/updateCampaing: Actualiza los datos del brief de una campaña existente
 *
 * Este módulo se monta en /ai en app.js, por lo que las rutas completas son:
 * - http://localhost:3000/ai/chat
 * - http://localhost:3000/ai/createCampaing
 * - http://localhost:3000/ai/updateCampaing
 * ------------------------------------------------------------------
 */

import { Remote } from "nicola-framework";
import handleChat from "../controllers/briefchat.controller.js";
import { brief_DB } from "../controllers/brief-db.controller.js";

// Instancia del enrutador de Nicola Framework
const RemoteRoute = new Remote();

/**
 * POST /ai/chat
 * Maneja la conversación con el usuario para recolectar datos del brief.
 * El controlador usa Vertex AI (Gemini) para procesar el diálogo.
 */
RemoteRoute.post("/chat", handleChat);

/**
 * POST /ai/createCampaing
 * Crea una nueva campaña en la base de datos.
 * Body esperado: { user_id: string }
 */
RemoteRoute.post("/createCampaing", brief_DB.Create_Campaing);

/**
 * POST /ai/updateCampaing
 * Actualiza el brief_data de una campaña existente.
 * Body esperado: { data: Object, idCampaing: string }
 */
RemoteRoute.post("/updateCampaing", brief_DB.updateDataBrief);

/**
 * POST /ai/registerBrief
 * Crea o actualiza un brief completo.
 * Body esperado: { data: Object, idCampaing?: string }
 */
RemoteRoute.post("/registerBrief", brief_DB.Registrar_Brief);

export default RemoteRoute;
