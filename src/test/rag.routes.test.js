// src/test/rag.routes.test.js

// ------------------------------------------------------------------
// 1. MOCK ANTI-BOMBA (Por seguridad)
// ------------------------------------------------------------------
jest.mock('../services/SupabaseClient.js', () => ({ supabase: {} }), { virtual: true });
jest.mock('../services/supaBaseClient.js', () => ({ supabase: {} }), { virtual: true });

// ------------------------------------------------------------------
// 2. MOCKS DEL FRAMEWORK
// ------------------------------------------------------------------
const mockPost = jest.fn();

jest.mock('nicola-framework', () => {
    return {
        Remote: jest.fn().mockImplementation(() => ({
            post: mockPost,
            get: jest.fn(),
            put: jest.fn(),
            use: jest.fn()
        }))
    };
});

// ------------------------------------------------------------------
// 3. MOCK DEL CONTROLADOR
// ------------------------------------------------------------------
// Mockeamos las exportaciones nombradas
jest.mock('../controllers/rag.controller.js', () => ({
    ingestManual: jest.fn(),
    querySearch: jest.fn()
}));

// ------------------------------------------------------------------
// 4. SUITE DE PRUEBAS
// ------------------------------------------------------------------
describe('RAG Routes', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules(); // Limpieza de caché obligatoria
    });

    // Helper para cargar todo fresco y sincronizado
    const setup = async () => {
        // 1. Importamos el Controlador y las Rutas juntos
        const ragCtrl = await import('../controllers/rag.controller.js');
        await import('../routes/rag.routes.js');

        return {
            ingestManual: ragCtrl.ingestManual,
            querySearch: ragCtrl.querySearch
        };
    };

    test('POST /ingestManual debe llamar a ingestManual', async () => {
        const { ingestManual } = await setup();
        
        expect(mockPost).toHaveBeenCalledWith(
            expect.stringMatching(/\/ingestManual/), // '/rag/ingestManual' o '/ingestManual'
            ingestManual
        );
    });

    test('POST /query debe llamar a querySearch', async () => {
        const { querySearch } = await setup();
        
        expect(mockPost).toHaveBeenCalledWith(
            expect.stringMatching(/\/query/),
            querySearch
        );
    });
});