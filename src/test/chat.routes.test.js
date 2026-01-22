// src/test/chat.routes.test.js

// ------------------------------------------------------------------
// 1. MOCK ANTI-BOMBA (Supabase)
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
// 3. MOCKS DE CONTROLADORES Y MIDDLEWARES
// ------------------------------------------------------------------

// A. Mock del ChatController (Export Default)
jest.mock('../controllers/briefchat.controller.js', () => ({
    __esModule: true,
    default: jest.fn()
}));

// B. Mock del BriefDB Controller (Export Nombrado 'brief_DB')
jest.mock('../controllers/brief-db.controller.js', () => ({
    brief_DB: {
        Create_Campaing: jest.fn(),
        updateDataBrief: jest.fn(),
        Registrar_Brief: jest.fn()
    }
}));

// C. Mocks de Middlewares
jest.mock('../middlewares/AuthMiddleware.js', () => ({
    requireAuth: 'MIDDLEWARE_REQUIRE_AUTH'
}));

jest.mock('../middlewares/roleMiddleware.js', () => ({
    requireRole: jest.fn(() => 'MIDDLEWARE_REQUIRE_ROLE')
}));

// ------------------------------------------------------------------
// 4. SUITE DE PRUEBAS
// ------------------------------------------------------------------
describe('Chat Routes', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules(); // Limpiamos la caché
    });

    // Helper de configuración para importar fresco
    const setup = async () => {
        // 1. Importamos Controladores
        const chatCtrl = await import('../controllers/briefchat.controller.js');
        const dbCtrl = await import('../controllers/brief-db.controller.js');
        
        // 2. Importamos Rutas (Ejecuta router.post...)
        await import('../routes/chat.routes.js');

        return {
            handleChat: chatCtrl.default,
            brief_DB: dbCtrl.brief_DB,
            requireRoleMock: (await import('../middlewares/roleMiddleware.js')).requireRole
        };
    };

    // TEST 1: /chat (User y Admin)
    test('POST /chat debe estar protegido y llamar a handleChat', async () => {
        const { handleChat, requireRoleMock } = await setup();

        expect(mockPost).toHaveBeenCalledWith(
            expect.stringMatching(/\/chat/),
            'MIDDLEWARE_REQUIRE_AUTH',
            'MIDDLEWARE_REQUIRE_ROLE',
            handleChat
        );

        // Verificamos roles permitidos: ['user', 'admin']
        // Buscamos la llamada específica para esta ruta
        // (Nota: requireRole se llama varias veces, pero Jest guarda el historial)
        expect(requireRoleMock).toHaveBeenCalledWith(['user', 'admin']);
    });

    // TEST 2: /createCampaing (SOLO ADMIN)
    test('POST /createCampaing debe ser SOLO para ADMIN', async () => {
        const { brief_DB, requireRoleMock } = await setup();

        expect(mockPost).toHaveBeenCalledWith(
            expect.stringMatching(/\/createCampaing/),
            'MIDDLEWARE_REQUIRE_AUTH',
            'MIDDLEWARE_REQUIRE_ROLE',
            brief_DB.Create_Campaing
        );

        // Verificamos que esta ruta específica pidió solo 'admin'
        expect(requireRoleMock).toHaveBeenCalledWith(['admin']);
    });

    // TEST 3: /updateCampaing (User y Admin)
    test('POST /updateCampaing debe llamar a updateDataBrief', async () => {
        const { brief_DB } = await setup();

        expect(mockPost).toHaveBeenCalledWith(
            expect.stringMatching(/\/updateCampaing/),
            'MIDDLEWARE_REQUIRE_AUTH',
            'MIDDLEWARE_REQUIRE_ROLE',
            brief_DB.updateDataBrief
        );
    });

    // TEST 4: /registerBrief (User y Admin)
    test('POST /registerBrief debe llamar a Registrar_Brief', async () => {
        const { brief_DB } = await setup();

        expect(mockPost).toHaveBeenCalledWith(
            expect.stringMatching(/\/registerBrief/),
            'MIDDLEWARE_REQUIRE_AUTH',
            'MIDDLEWARE_REQUIRE_ROLE',
            brief_DB.Registrar_Brief
        );
    });
});