import { jest } from '@jest/globals';

// MOCKS
jest.unstable_mockModule('../services/SupabaseClient.js', () => ({ supabase: {} }));
jest.unstable_mockModule('../services/supaBaseClient.js', () => ({ supabase: {} }));

const mockGet = jest.fn();
jest.unstable_mockModule('nicola-framework', () => ({
    Remote: jest.fn().mockImplementation(() => ({
        get: mockGet,
        post: jest.fn(),
        put: jest.fn(),
        use: jest.fn()
    }))
}));

jest.unstable_mockModule('../controllers/campaigns.controller.js', () => ({
    getCampaigns: jest.fn(),
    getCampaignsDesigners: jest.fn(),
    updateStateCampaign: jest.fn(),
    getCampaingById: jest.fn()
}));

jest.unstable_mockModule('../controllers/brief-db.controller.js', () => ({ brief_DB: {} }));

// SUITE
describe('Campaigns Routes (ESM)', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        jest.resetModules();
        await import('../routes/campaigns.routes.js');
    });

    test('GET / debe llamar a getCampaigns', async () => {
        const { getCampaigns } = await import('../controllers/campaigns.controller.js');
        expect(mockGet).toHaveBeenCalledWith('/', getCampaigns);
    });
});