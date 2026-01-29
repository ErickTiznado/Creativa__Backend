
import { jest } from '@jest/globals';

jest.unstable_mockModule('nicola-framework', () => ({
    Dynamo: {
        Model: class { }
    }
}));

describe('Profile Model', () => {
    let Profile;

    beforeAll(async () => {
        const module = await import('../model/profile.model');
        Profile = module.Profile;
    });

    test('should be defined', () => {
        expect(Profile).toBeDefined();
    });

    test('should have correct tableName', () => {
        expect(Profile.tableName).toBe('devschema.profile');
    });
});
