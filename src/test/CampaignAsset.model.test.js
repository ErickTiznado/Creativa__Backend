
import { jest } from '@jest/globals';

jest.unstable_mockModule('nicola-framework', () => ({
    Dynamo: {
        Model: class { }
    }
}));

describe('CampaignAsset Model', () => {
    let CampaignAsset;

    beforeAll(async () => {
        const module = await import('../model/CampaignAsset.model');
        CampaignAsset = module.default;
    });

    test('should be defined', () => {
        expect(CampaignAsset).toBeDefined();
    });

    test('should have correct tableName', () => {
        expect(CampaignAsset.tableName).toBe('devschema.campaign_assets');
    });

    test('should have correct schema', () => {
        expect(CampaignAsset.schema).toEqual({
            campaign_assets: { type: "string", required: true },
            img_url: { type: "object", required: true },
            prompt_used: { type: "string", required: false },
            is_approved: { type: "boolean", required: false }
        });
    });
});
