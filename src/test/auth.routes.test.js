// src/test/auth.routes.test.js

// ------------------------------------------------------------------
// 1. MOCKS GLOBALES
// ------------------------------------------------------------------

// Mock de Supabase (Anti-Bomba)
jest.mock('../services/SupabaseClient.js', () => ({ supabase: {} }), { virtual: true });
jest.mock('../services/supaBaseClient.js', () => ({ supabase: {} }), { virtual: true });

// Mock de Nicola Framework
const mockPost = jest.fn();
const mockPut = jest.fn();

jest.mock('nicola-framework', () => {
    return {
        Remote: jest.fn().mockImplementation(() => ({
            post: mockPost,
            put: mockPut,
            use: jest.fn(),
            get: jest.fn()
        })),
        Insulator: jest.fn(() => 'MIDDLEWARE_INSULATOR'),
        Regulator: { load: jest.fn() }
    };
});

// Mock del Controlador
jest.mock('../controllers/auth.controller.js');

// Mock de Middlewares
jest.mock('../middlewares/AuthMiddleware.js', () => ({
    requireAuth: 'MIDDLEWARE_REQUIRE_AUTH'
}));

jest.mock('../middlewares/roleMiddleware.js', () => ({
    requireRole: jest.fn(() => 'MIDDLEWARE_REQUIRE_ROLE')
}));


// ------------------------------------------------------------------
// 2. SUITE DE PRUEBAS
// ------------------------------------------------------------------
describe('Auth Routes (Configuración de Rutas)', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules(); // Limpia la memoria para iniciar fresco
    });

    // Helper para cargar todo fresco y sincronizado
    const setup = async () => {
        // 1. Importamos el Controlador y las Rutas AL MISMO TIEMPO
        // Esto asegura que ambos usen la misma "versión" creada por resetModules
        const AuthController = (await import('../controllers/auth.controller.js')).default;
        await import('../routes/auth.routes.js'); // Esto dispara los router.post...

        return { AuthController };
    };

    test('POST /login debe tener Insulator y AuthController.login', async () => {
        const { AuthController } = await setup();
        
        expect(mockPost).toHaveBeenCalledWith(
            expect.stringMatching(/\/login/),
            'MIDDLEWARE_INSULATOR',
            AuthController.login // Ahora sí es la misma referencia
        );
    });

    test('POST /register debe tener Insulator y AuthController.register', async () => {
        const { AuthController } = await setup();
        
        expect(mockPost).toHaveBeenCalledWith(
            expect.stringMatching(/\/register/),
            'MIDDLEWARE_INSULATOR',
            AuthController.register
        );
    });

    test('POST /forgot-password debe llamar a AuthController.forgotPassword', async () => {
        const { AuthController } = await setup();
        
        expect(mockPost).toHaveBeenCalledWith(
            expect.stringMatching(/\/forgot-password/),
            AuthController.forgotPassword
        );
    });

    test('POST /reset-password debe llamar a AuthController.resetPassword', async () => {
        const { AuthController } = await setup();
        
        expect(mockPost).toHaveBeenCalledWith(
            expect.stringMatching(/\/reset-password/),
            AuthController.resetPassword
        );
    });

    test('PUT /profile debe estar protegida por requireAuth', async () => {
        const { AuthController } = await setup();
        
        expect(mockPut).toHaveBeenCalledWith(
            expect.stringMatching(/\/profile/),
            'MIDDLEWARE_REQUIRE_AUTH',
            AuthController.updateProfile
        );
    });

    test('POST /users/role debe tener requireAuth y requireRole(["admin"])', async () => {
        const { AuthController } = await setup();
        
        expect(mockPost).toHaveBeenCalledWith(
            expect.stringMatching(/\/users\/role/),
            'MIDDLEWARE_REQUIRE_AUTH',
            'MIDDLEWARE_REQUIRE_ROLE',
            AuthController.changeUserRole
        );
    });
});