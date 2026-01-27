import { jest } from '@jest/globals';

// 1. MOCKS DE DEPENDENCIAS
jest.unstable_mockModule('../services/SupabaseClient.js', () => ({ supabase: {} }));
jest.unstable_mockModule('../services/supaBaseClient.js', () => ({ supabase: {} }));

// MOCK CLAVE: Nicola Framework (Para evitar el error de "Unexpected token export")
const mockPost = jest.fn();
const mockPut = jest.fn();

jest.unstable_mockModule('nicola-framework', () => ({
    Remote: jest.fn().mockImplementation(() => ({
        post: mockPost,
        put: mockPut,
        get: jest.fn(),
        use: jest.fn()
    })),
    Insulator: jest.fn(() => 'MIDDLEWARE_INSULATOR'),
    Regulator: { load: jest.fn() }
}));

// Mockeamos el controlador para no depender de su lógica interna aquí
jest.unstable_mockModule('../controllers/auth.controller.js', () => ({
    default: {
        login: jest.fn(),
        register: jest.fn(),
        forgotPassword: jest.fn(),
        resetPassword: jest.fn(),
        updateProfile: jest.fn(),
        changeUserRole: jest.fn()
    }
}));

jest.unstable_mockModule('../middlewares/AuthMiddleware.js', () => ({
    requireAuth: 'MIDDLEWARE_REQUIRE_AUTH'
}));

jest.unstable_mockModule('../middlewares/roleMiddleware.js', () => ({
    requireRole: jest.fn(() => 'MIDDLEWARE_REQUIRE_ROLE')
}));

// 2. SUITE DE PRUEBAS
describe('Auth Routes (ESM)', () => {

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.resetModules();
        // Importamos la ruta. NO usamos ?t=... porque en ESM da error ENOENT
        await import('../routes/auth.routes.js');
    });

    test('POST /login debe tener configuración correcta', () => {
        expect(mockPost).toHaveBeenCalledWith(
            expect.stringMatching(/\/login/),
            'MIDDLEWARE_INSULATOR',
            expect.any(Function)
        );
    });

    test('PUT /profile debe estar protegida', () => {
        expect(mockPut).toHaveBeenCalledWith(
            expect.stringMatching(/\/profile/),
            'MIDDLEWARE_REQUIRE_AUTH',
            expect.any(Function)
        );
    });
});