/**
 * ------------------------------------------------------------------
 * Archivo: chatRoutes.js
 * Ubicación: src/routes/chatRoutes.js
 * Responsabilidad: Definir endpoints del módulo IA/Brief para chat conversacional
 * y gestión de campañas.
 * * Endpoints disponibles (PROTEGIDOS):
 * - POST /ai/chat: Inicia/continúa conversación (Requiere rol: user, admin)
 * - POST /ai/createCampaing: Crea nueva campaña (Requiere rol: admin)
 * - POST /ai/updateCampaing: Actualiza brief (Requiere rol: user, admin)
 * ------------------------------------------------------------------
 */

import { Remote } from "nicola-framework";
import handleChat from "../controllers/briefchat.controller.js";
import { brief_DB } from "../controllers/brief-db.controller.js";

// TAREA 3: Importación de Middlewares de Seguridad
import { requireAuth } from "../middlewares/AuthMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";

// Instancia del enrutador de Nicola Framework
const RemoteRoute = new Remote();

/**
 * POST /ai/chat
 * Maneja la conversación con el usuario para recolectar datos del brief.
 * Seguridad: Autenticado + Roles ['user', 'admin']
 */
RemoteRoute.post(
  "/chat",
  requireAuth,
  requireRole(["marketing", "admin", "designer"]),
  handleChat,
);

/**
 * POST /ai/createCampaing
 * Crea una nueva campaña en la base de datos.
 * Seguridad: Autenticado + Rol ['admin'] (SOLO ADMIN según Tarea 3.2)
 */
RemoteRoute.post(
  "/createCampaing",
  requireAuth,
  requireRole(["admin"]),
  brief_DB.Create_Campaing,
);

/**
 * POST /ai/updateCampaing
 * Actualiza el brief_data de una campaña existente.
 * Seguridad: Autenticado + Roles ['user', 'admin']
 */
RemoteRoute.post(
  "/updateCampaing",
  requireAuth,
  requireRole(["user", "admin"]),
  brief_DB.updateDataBrief,
);

/**
 * POST /ai/registerBrief
 * Crea o actualiza un brief completo.
 * Seguridad: Autenticado + Roles ['user', 'admin']
 */
RemoteRoute.post(
  "/registerBrief",
  requireAuth,
  requireRole(["user", "admin"]),
  brief_DB.Registrar_Brief,
);

export default RemoteRoute;
