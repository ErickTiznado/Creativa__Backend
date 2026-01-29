
import { jest } from '@jest/globals';

jest.unstable_mockModule('nicola-framework', () => ({
    Dynamo: {
        Model: class { }
    }
}));

describe('Assets Model', () => {
    let Assets;

    beforeAll(async () => {
        const module = await import('../model/assets.model');
        Assets = module.default;
    });

    test('should be defined', () => {
        expect(Assets).toBeDefined();
    });

    test('should have correct tableName', () => {
        expect(Assets.tableName).toBe('devschema.campaign_assets');
    });
});
