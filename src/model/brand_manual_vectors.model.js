/**
 * ------------------------------------------------------------------
 * Archivo: brand_manual_vectors.model.js
 * Ubicación: src/model/brand_manual_vectors.model.js
 * Responsabilidad: Modelo Dynamo (Nicola) para persistir vectores del manual.
 *
 * Campos esperados por el controller (ver RagController):
 * - content_text (string)
 * - metadata (json string)
 * - embedding (json string)
 * ------------------------------------------------------------------
 */

import {Dynamo}  from "nicola-framework"

class BrandManualVectorsModel extends Dynamo.Model {
    static tableName = "devschema.brand_manual_vectors";
}


export default BrandManualVectorsModel;