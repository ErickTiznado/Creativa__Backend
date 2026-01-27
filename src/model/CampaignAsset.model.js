import { Dynamo } from "nicola-framework";

export default class CampaignAsset extends Dynamo.Model {
    static tableName = "devschema.campaign_assets";

    static schema = {
        // ANTES DECÍA: campaign_id: { type: "string", required: true },

        // AHORA DEBE DECIR (Igual que en tu base de datos y controlador):
        campaign_assets: { type: "string", required: true },

        img_url: { type: "object", required: true },
        prompt_used: { type: "string", required: false },
        is_approved: { type: "boolean", required: false }
    };
}