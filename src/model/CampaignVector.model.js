/**
 * ------------------------------------------------------------------
 * Archivo: CampaignVector.model.js
 * Ubicación: src/model/CampaignVector.model.js
 * Responsabilidad: Modelo Dynamo (Nicola) para persistir vectores de campañas.
 * ------------------------------------------------------------------
 */

import { Dynamo } from "nicola-framework";

export default class CampaignVector extends Dynamo.Model {
  static tableName = "devschema.campaign_vectors";

  static schema = {
    campaign_id: { type: "uuid", required: true },
    embedding: { type: "object", required: true }, // Array de floats (768 dim para text-embedding-004)
    text_content: { type: "string", required: false }, // Texto concatenado usado para generar el vector
  };
}
