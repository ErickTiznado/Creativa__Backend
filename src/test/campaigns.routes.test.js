// src/test/campaigns.routes.test.js

// ------------------------------------------------------------------
// 1. MOCK ANTI-BOMBA
// ------------------------------------------------------------------
// Aunque este archivo no lo use directo, el controlador podría llamarlo.
// Mejor prevenir que lamentar.
jest.mock('../services/SupabaseClient.js', () => ({ supabase: {} }), { virtual: true });
jest.mock('../services/supaBaseClient.js', () => ({ supabase: {} }), { virtual: true });

// ------------------------------------------------------------------
// 2. MOCKS DEL FRAMEWORK Y CONTROLADOR
// ------------------------------------------------------------------
const mockGet = jest.fn();

// Mock de Nicola Framework
jest.mock('nicola-framework', () => {
    return {
        Remote: jest.fn().mockImplementation(() => ({
            get: mockGet,
            post: jest.fn(),
            put: jest.fn(),
            use: jest.fn()
        }))
    };
});

// Mock del Controlador
// OJO: Aquí 'getCampaigns' es una exportación nombrada, no default.
jest.mock('../controllers/campaigns.controller.js', () => ({
    getCampaigns: jest.fn()
}));

// ------------------------------------------------------------------
// 3. SUITE DE PRUEBAS
// ------------------------------------------------------------------
describe('Campaigns Routes', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules(); // Limpiamos caché para evitar conflictos
    });

    // Helper de configuración (La técnica maestra)
    const setup = async () => {
        // 1. Importamos el controlador fresco
        const controllerModule = await import('../controllers/campaigns.controller.js');
        
        // 2. Importamos la ruta fresca (esto ejecuta router.get(...))
        // Ajusta el nombre del archivo si es mayúscula/minúscula en tu carpeta
        await import('../routes/campaigns.routes.js'); 

        // Retornamos la función específica del controlador
        return { getCampaigns: controllerModule.getCampaigns };
    };

    test('GET / debe llamar a CampaignsController.getCampaigns', async () => {
        const { getCampaigns } = await setup();

        expect(mockGet).toHaveBeenCalledWith(
            '/',            // La ruta raíz
            getCampaigns    // La función del controlador correcta
        );
    });
});