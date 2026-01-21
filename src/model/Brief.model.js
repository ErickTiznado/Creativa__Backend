/**
 * ------------------------------------------------------------------
 * Archivo: Brief.model.js
 * Ubicación: src/model/Brief.model.js
 * Responsabilidad: Definir el schema del modelo Brief para Dynamo (Nicola).
 * ------------------------------------------------------------------
 */

import { Dynamo } from "nicola-framework";

export default class Brief extends Dynamo.Model {
  static tableName = "devschema.campaigns";
}
