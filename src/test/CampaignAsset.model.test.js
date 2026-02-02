import { jest } from '@jest/globals';

// 1. MOCK NICOLA FRAMEWORK
class MockDynamoModel {
    static tableName = "";
    static schema = {};
}

jest.unstable_mockModule('nicola-framework', () => ({
    Dynamo: {
        Model: MockDynamoModel
    }
}));

// 2. IMPORT MODEL
const { default: CampaignAsset } = await import('../model/CampaignAsset.model.js');

// 3. SUITE
describe('CampaignAsset Model', () => {

    test('Debe heredar de Dynamo.Model', () => {
        const proto = Object.getPrototypeOf(CampaignAsset);
        // Because of the mock, proto should clearly point to the mock class mechanics
        // or effectively be the mock class if implementation is "extends Dynamo.Model"
        // Let's verify properties exist.
        expect(CampaignAsset.tableName).toBeDefined();
    });

    test('Debe tener el nombre de tabla correcto', () => {
        expect(CampaignAsset.tableName).toBe('devschema.campaign_assets');
    });

    test('Debe tener el esquema correcto', () => {
        const schema = CampaignAsset.schema;

        expect(schema).toBeDefined();

        // Critical fields check
        expect(schema.campaign_assets).toEqual({ type: "string", required: true });
        expect(schema.img_url).toEqual({ type: "object", required: true });
        expect(schema.prompt_used).toEqual({ type: "string", required: false });
        expect(schema.is_approved).toEqual({ type: "boolean", required: false });
        // Checking one specific optional field to ensure completeness
        expect(schema.parent_asset_id).toEqual({ type: "string", required: false });
    });
});
