/**
 * ------------------------------------------------------------------
 * Archivo: Brief.model.js
 * Ubicación: src/model/Brief.model.js
 * Responsabilidad: Definir el schema del modelo Brief para Dynamo (Nicola).
 * ------------------------------------------------------------------
 */

import { Dynamo } from "nicola-framework";

export default class Brief extends Dynamo.Model {
  static tableName = "Brief";

  static schema = {
    idBrief: {type: "number", required: false },
    ContentType: { type: "string", required: true },
    Topic : { type: "string", required: true },
    Description : { type: "string", required: false },
    Objective : { type: "string", required: false },
    observations : { type: "string", required: false },
  };
}

