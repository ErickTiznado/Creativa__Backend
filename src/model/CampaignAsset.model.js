import { Dynamo } from "nicola-framework";

export default class CampaignAsset extends Dynamo.Model {
    static tableName = "devschema.campaign_assets";

    static schema = {
        // ANTES DECÍA: campaign_id: { type: "string", required: true },

        // AHORA DEBE DECIR (Igual que en tu base de datos y controlador):
        campaign_assets: { type: "string", required: true },

        img_url: { type: "object", required: true },
        prompt_used: { type: "string", required: false },
        is_approved: { type: "boolean", required: false },
        status: { type: "string", required: false },
        storage_location: { type: "string", required: false },
        approved_at: { type: "string", required: false },
        approved_by: { type: "string", required: false },
        rejected_at: { type: "string", required: false },
        rejected_by: { type: "string", required: false },
        rejected_reason: { type: "string", required: false },
        parent_asset_id: { type: "string", required: false },
    };
}