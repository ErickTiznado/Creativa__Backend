import { Dynamo } from "nicola-framework";

export default class CampaignAssetVector extends Dynamo.Model {
    static tableName = "devschema.campaign_asset_vectors";

    static schema = {
        asset_id: { type: "string", required: true },
        embedding: { type: "object", required: true }, // Array de 1408 floats
        prompt_used: { type: "string", required: false },
        created_at: { type: "date", required: false }
    };
}