import { jest } from '@jest/globals';

// 1. MOCKS
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

// Mockeamos el controlador para no depender de él
jest.unstable_mockModule('../controllers/rag.controller.js', () => ({
    ingestManual: jest.fn(),
    querySearch: jest.fn()
}));

// 2. SUITE
describe('RAG Routes (ESM)', () => {

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.resetModules();
        // Importamos las rutas AQUÍ dentro para que se ejecuten con el mock limpio
        await import('../routes/rag.routes.js');
    });

    test('Rutas configuradas', () => {
        // Verificamos que se haya llamado a .post con la URL correcta
        expect(mockPost).toHaveBeenCalledWith(
            expect.stringMatching(/\/ingestManual/),
            expect.any(Function)
        );

        expect(mockPost).toHaveBeenCalledWith(
            expect.stringMatching(/\/query/),
            expect.any(Function)
        );
    });
});