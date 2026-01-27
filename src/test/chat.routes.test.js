import { jest } from '@jest/globals';

// MOCKS
jest.unstable_mockModule('../services/SupabaseClient.js', () => ({ supabase: {} }));
jest.unstable_mockModule('../services/supaBaseClient.js', () => ({ supabase: {} }));

const mockPost = jest.fn();
jest.unstable_mockModule('nicola-framework', () => ({
    Remote: jest.fn().mockImplementation(() => ({
        post: mockPost,
        get: jest.fn(),
        put: jest.fn(),
        use: jest.fn()
    }))
}));

jest.unstable_mockModule('../controllers/briefchat.controller.js', () => ({ default: jest.fn() }));
jest.unstable_mockModule('../controllers/brief-db.controller.js', () => ({
    brief_DB: {
        Create_Campaing: jest.fn(),
        updateDataBrief: jest.fn(),
        Registrar_Brief: jest.fn()
    }
}));
jest.unstable_mockModule('../middlewares/AuthMiddleware.js', () => ({ requireAuth: 'AUTH' }));
jest.unstable_mockModule('../middlewares/roleMiddleware.js', () => ({ requireRole: jest.fn(() => 'ROLE') }));

// SUITE
describe('Chat Routes (ESM)', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        jest.resetModules();
        await import('../routes/chat.routes.js');
    });

    test('Rutas POST configuradas', () => {
        expect(mockPost).toHaveBeenCalledWith(expect.stringMatching(/\/chat/), 'AUTH', 'ROLE', expect.any(Function));
    });
});