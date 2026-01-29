
import { jest } from '@jest/globals';

jest.unstable_mockModule('nicola-framework', () => ({
    Dynamo: {
        Model: class { }
    }
}));

describe('Brief Model', () => {
    let Brief;

    beforeAll(async () => {
        const module = await import('../model/Brief.model');
        Brief = module.default;
    });

    test('should be defined', () => {
        expect(Brief).toBeDefined();
    });

    test('should have correct tableName', () => {
        expect(Brief.tableName).toBe('devschema.campaigns');
    });
});
