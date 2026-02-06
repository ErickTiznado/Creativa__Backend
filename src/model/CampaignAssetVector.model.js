import { Dynamo } from "nicola-framework";

export default class CampaignAssetVector extends Dynamo.Model {
  static tableName = "devschema.campaign_asset_vectors";

  static schema = {
    asset_id: { type: "string", required: true },
    embedding: { type: "string", required: true }, // Array de 1408 floats (stringified)
    prompt_used: { type: "string", required: false },
  };
}
