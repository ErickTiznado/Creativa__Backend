/**
 * ------------------------------------------------------------------
 * Archivo: ChatSession.model.js
 * Ubicación: src/model/ChatSession.model.js
 * Responsabilidad: Definir el schema del modelo para las sesiones de chat.
 * ------------------------------------------------------------------
 */

import { Dynamo } from "nicola-framework";

export default class ChatSession extends Dynamo.Model {
    static tableName = "devschema.campaings_chat_sessions";
}
