
import { jest } from '@jest/globals';

jest.unstable_mockModule('nicola-framework', () => ({
    Dynamo: {
        Model: class { }
    }
}));

describe('BrandManualVectorsModel', () => {
    let BrandManualVectorsModel;

    beforeAll(async () => {
        const module = await import('../model/brand_manual_vectors.model');
        BrandManualVectorsModel = module.default;
    });

    test('should be defined', () => {
        expect(BrandManualVectorsModel).toBeDefined();
    });

    test('should have correct tableName', () => {
        expect(BrandManualVectorsModel.tableName).toBe('devschema.brand_manual_vectors');
    });
});
