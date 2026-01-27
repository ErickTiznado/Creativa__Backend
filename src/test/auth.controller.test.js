import { jest } from '@jest/globals';

// 1. DEFINIR MOCKS
const mockBuilder = {
    schema: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn(),
    single: jest.fn(),
    maybeSingle: jest.fn()
};

// Configurar comportamiento dual de .eq()
// Permite: await eq() -> resuelve promesa
// Permite: eq().single() -> encadena
const setupMockBuilder = () => {
    // Reset basic mocks
    mockBuilder.schema.mockReturnThis();
    mockBuilder.from.mockReturnThis();
    mockBuilder.select.mockReturnThis();
    mockBuilder.update.mockReturnThis();
    mockBuilder.insert.mockResolvedValue({ data: {}, error: null }); // insert suele ser terminal

    // eq devuelve una Promesa que tiene métodos adjuntos
    mockBuilder.eq.mockImplementation(() => {
        const p = Promise.resolve({ data: {}, error: null });
        p.single = mockBuilder.single;
        p.maybeSingle = mockBuilder.maybeSingle;
        return p;
    });

    mockBuilder.single.mockResolvedValue({ data: {}, error: null });
    return mockBuilder;
}

const mockMatches = jest.fn(() => true);

jest.unstable_mockModule('../services/SupabaseClient.js', () => ({ supabase: mockBuilder }));
jest.unstable_mockModule('../services/supaBaseClient.js', () => ({ supabase: mockBuilder }));

jest.unstable_mockModule('nicola-framework', () => ({
    Coherer: {
        sign: jest.fn(() => 'fake_jwt_token'),
        verify: jest.fn(() => ({ userId: 'user-123' }))
    },
    PatternBuilder: jest.fn().mockImplementation(() => ({
        startOfLine: jest.fn().mockReturnThis(),
        word: jest.fn().mockReturnThis(),
        oneOrMore: jest.fn().mockReturnThis(),
        find: jest.fn().mockReturnThis(),
        endOfLine: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        digit: jest.fn().mockReturnThis(),
        matches: mockMatches
    }))
}));

const { default: AuthController } = await import('../controllers/auth.controller.js');

describe('AuthController Tests (Complete)', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        setupMockBuilder();

        // Agregar Auth Mocks al builder
        mockBuilder.auth = {
            signInWithPassword: jest.fn(),
            signUp: jest.fn(),
            resetPasswordForEmail: jest.fn(),
            getUser: jest.fn(),
            admin: { updateUserById: jest.fn() }
        };

        mockMatches.mockReturnValue(true); // Default valid pattern

        req = { body: {}, headers: {}, user: { userId: '123' } };
        res = { statusCode: 200, json: jest.fn(), status: jest.fn().mockReturnThis() };

        process.env.FRONTEND_URL = 'http://localhost';
    });

    describe('login', () => {
        test('Debe devolver 400 si faltan credenciales', async () => {
            req.body = { email: '' }; // Fallta pass
            await AuthController.login(req, res);
            expect(res.statusCode).toBe(400);
        });

        test('Debe devolver 200 y Token si todo es correcto', async () => {
            req.body = { email: 'test@test.com', password: '123' };
            mockBuilder.auth.signInWithPassword.mockResolvedValue({
                data: { user: { id: '123', email: 'test@test.com' } },
                error: null
            });
            mockBuilder.single.mockResolvedValue({ data: { role: 'admin' }, error: null });

            await AuthController.login(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'fake_jwt_token' }));
        });
    });

    describe('register', () => {
        test('Debe registrar usuario correctamente', async () => {
            req.body = { email: 'new@test.com', password: '123', firstName: 'F', lastName: 'L' };

            mockBuilder.auth.signUp.mockResolvedValue({
                data: { user: { id: 'u1' } }, error: null
            });
            mockBuilder.insert.mockResolvedValue({ error: null });

            await AuthController.register(req, res);

            expect(res.statusCode).toBe(201);
            expect(mockBuilder.from).toHaveBeenCalledWith('profile');
            expect(mockBuilder.insert).toHaveBeenCalled();
        });

        test('Debe manejar error de Supabase Auth', async () => {
            req.body = { email: 'x', password: 'x' };
            mockBuilder.auth.signUp.mockResolvedValue({ data: null, error: { message: 'Fail' } });

            await AuthController.register(req, res);
            expect(res.statusCode).toBe(400);
        });
    });

    describe('forgotPassword', () => {
        test('Debe enviar correo de recuperación', async () => {
            req.body = { email: 'valid@test.com' };
            mockMatches.mockReturnValue(true);
            mockBuilder.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

            await AuthController.forgotPassword(req, res);

            expect(res.statusCode).toBe(200);
            expect(mockBuilder.auth.resetPasswordForEmail).toHaveBeenCalled();
        });

        test('Debe validar formato de email', async () => {
            req.body = { email: 'bad-email' };
            mockMatches.mockReturnValue(false); // Simulamos fallo pattern

            await AuthController.forgotPassword(req, res);
            expect(res.statusCode).toBe(400);
        });
    });

    describe('resetPassword', () => {
        test('Debe reestablecer contraseña con token válido', async () => {
            req.headers.authorization = "Bearer valid_token";
            req.body = { newPassword: "Pass1234" };

            // getUser token -> user
            mockBuilder.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
            // updateUser -> ok
            mockBuilder.auth.admin.updateUserById.mockResolvedValue({ error: null });

            await AuthController.resetPassword(req, res);

            expect(res.statusCode).toBe(200);
        });

        test('Debe fallar si token es inválido', async () => {
            req.headers.authorization = "Bearer bad_token";
            req.body = { newPassword: "Pass1234" };

            mockBuilder.auth.getUser.mockResolvedValue({ data: {}, error: { message: "Invalid" } });

            await AuthController.resetPassword(req, res);
            expect(res.statusCode).toBe(401);
        });
    });

    describe('getProfile', () => {
        test('Debe devolver el perfil del usuario', async () => {
            req.user = { userId: 'u1' };
            mockBuilder.single.mockResolvedValue({ data: { name: 'Pepe' }, error: null });

            await AuthController.getProfile(req, res);

            expect(mockBuilder.eq).toHaveBeenCalledWith('id', 'u1');
            expect(res.json).toHaveBeenCalledWith({ name: 'Pepe' });
        });
    });

    describe('updateProfile', () => {
        test('Debe actualizar perfil', async () => {
            req.user = { userId: 'u1' };
            req.body = { firstName: 'Juan' }; // Data válida

            // update() -> eq() se espera que devuelva promesa
            // El setupMockBuilder hace que eq() devuelva promesa
            // Luego hace select().eq().single() -> single devuelve promesa

            mockBuilder.single.mockResolvedValue({ data: { first_name: 'Juan' }, error: null });

            await AuthController.updateProfile(req, res);

            expect(res.statusCode).toBe(200);
        });

        test('Debe fallar si no hay datos', async () => {
            req.user = { userId: 'u1' };
            req.body = {}; // Vacío

            await AuthController.updateProfile(req, res);
            expect(res.statusCode).toBe(400);
        });
    });

    describe('changeUserRole', () => {
        test('Debe cambiar el rol si es admin y target válido', async () => {
            req.user = { userId: 'admin1' };
            req.body = { targetUserId: 'user2', newRole: 'admin' };

            // Admin auth update
            mockBuilder.auth.admin.updateUserById.mockResolvedValue({ error: null });
            // DB update
            // update().eq() devuelve promesa gracias al mockBuilder

            await AuthController.changeUserRole(req, res);

            expect(res.statusCode).toBe(200);
        });

        test('Debe evitar auto-cambio de rol', async () => {
            req.user = { userId: 'admin1' };
            req.body = { targetUserId: 'admin1', newRole: 'user' };

            await AuthController.changeUserRole(req, res);
            expect(res.statusCode).toBe(400);
        });
    });
});