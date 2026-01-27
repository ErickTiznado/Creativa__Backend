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

        test('Debe manejar error interno (500)', async () => {
            req.body = { email: 'e', password: 'p' };
            mockBuilder.auth.signInWithPassword.mockRejectedValue(new Error("Crash"));
            await AuthController.login(req, res);
            expect(res.statusCode).toBe(500);
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

        test('Debe manejar error al guardar perfil (insert)', async () => {
            req.body = { email: 'x', password: 'x' };
            mockBuilder.auth.signUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
            // Mock insert failure
            mockBuilder.insert.mockResolvedValue({ error: { message: "DB Error" } });

            await AuthController.register(req, res);
            expect(res.statusCode).toBe(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("falló al guardar el perfil") }));
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

        test('Debe fallar si FRONTEND_URL no está definido', async () => {
            req.body = { email: 'valid@test.com' };
            delete process.env.FRONTEND_URL; // Force undefined

            await AuthController.forgotPassword(req, res);
            expect(res.statusCode).toBe(500);
            expect(process.env.FRONTEND_URL).toBeUndefined();

            process.env.FRONTEND_URL = 'http://localhost'; // Restore
        });

        test('Debe manejar error de Supabase resetPasswordForEmail', async () => {
            req.body = { email: 'valid@test.com' };
            mockBuilder.auth.resetPasswordForEmail.mockResolvedValue({ error: { message: "SupaFail" } });

            await AuthController.forgotPassword(req, res);
            expect(res.statusCode).toBe(500);
        });
    });

    describe('resetPassword', () => {
        test('Debe reestablecer contraseña con token válido', async () => {
            req.headers.authorization = "Bearer valid_token";
            req.body = { newPassword: "Pass1234" };

            mockBuilder.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
            mockBuilder.auth.admin.updateUserById.mockResolvedValue({ error: null });

            await AuthController.resetPassword(req, res);

            expect(res.statusCode).toBe(200);
        });

        test('Debe fallar si contraseña es inválida (corta o incompleta)', async () => {
            req.headers.authorization = "Bearer t";
            req.body = { newPassword: "short" };
            await AuthController.resetPassword(req, res);
            expect(res.statusCode).toBe(400); // Length check

            req.body = { newPassword: "password123withoutUppercase" };
            // Assuming matches fails for pattern check
            mockMatches.mockReturnValueOnce(false);
            await AuthController.resetPassword(req, res);
            expect(res.statusCode).toBe(400);
        });

        test('Debe fallar si token es inválido', async () => {
            req.headers.authorization = "Bearer bad_token";
            req.body = { newPassword: "Pass1234" };
            mockBuilder.auth.getUser.mockResolvedValue({ data: {}, error: { message: "Invalid" } });

            await AuthController.resetPassword(req, res);
            expect(res.statusCode).toBe(401);
        });

        test('Debe manejar error al actualizar usuario', async () => {
            req.headers.authorization = "Bearer t";
            req.body = { newPassword: "Pass1234" };
            mockBuilder.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
            mockBuilder.auth.admin.updateUserById.mockResolvedValue({ error: { message: "Update Fail" } });

            await AuthController.resetPassword(req, res);
            expect(res.statusCode).toBe(500);
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

        test('Debe manejar error al obtener perfil', async () => {
            req.user = { userId: 'u1' };
            mockBuilder.single.mockResolvedValue({ data: null, error: { message: "DB Fail" } });
            await AuthController.getProfile(req, res);
            expect(res.statusCode).toBe(500);
        });
    });

    describe('updateProfile', () => {
        test('Debe actualizar perfil', async () => {
            req.user = { userId: 'u1' };
            req.body = { firstName: 'Juan' };

            // Update -> ok (mockBuilder setup returns Promise for update too)
            mockBuilder.update.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
            // Fetch updated -> ok
            mockBuilder.single.mockResolvedValue({ data: { first_name: 'Juan' }, error: null });

            await AuthController.updateProfile(req, res);
            expect(res.statusCode).toBe(200);
        });

        test('Debe fallar si no hay datos', async () => {
            req.user = { userId: 'u1' };
            req.body = {};
            await AuthController.updateProfile(req, res);
            expect(res.statusCode).toBe(400);
        });

        test('Debe manejar error al actualizar DB', async () => {
            req.user = { userId: 'u1' };
            req.body = { firstName: 'Juan' };
            // Mock update fail
            mockBuilder.update.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: { message: "UpdErr" } }) });

            await AuthController.updateProfile(req, res);
            expect(res.statusCode).toBe(500);
        });
    });

    describe('changeUserRole', () => {
        test('Debe cambiar el rol si es admin y target válido', async () => {
            req.user = { userId: 'admin1' };
            req.body = { targetUserId: 'user2', newRole: 'admin' };

            mockBuilder.auth.admin.updateUserById.mockResolvedValue({ error: null });
            // DB update ok
            mockBuilder.update.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

            await AuthController.changeUserRole(req, res);
            expect(res.statusCode).toBe(200);
        });

        test('Debe evitar auto-cambio de rol', async () => {
            req.user = { userId: 'admin1' };
            req.body = { targetUserId: 'admin1', newRole: 'user' };
            await AuthController.changeUserRole(req, res);
            expect(res.statusCode).toBe(400);
        });

        test('Debe validar rol inexistente', async () => {
            req.user = { userId: 'admin1' };
            req.body = { targetUserId: 'user2', newRole: 'supergod' };
            await AuthController.changeUserRole(req, res);
            expect(res.statusCode).toBe(400);
        });

        test('Debe manejar error de Auth update', async () => {
            req.user = { userId: 'a' };
            req.body = { targetUserId: 'u', newRole: 'admin' };
            mockBuilder.auth.admin.updateUserById.mockResolvedValue({ error: { message: "AuthErr" } });
            await AuthController.changeUserRole(req, res);
            expect(res.statusCode).toBe(500);
        });

        test('Debe manejar error de DB update tras Auth update', async () => {
            req.user = { userId: 'a' };
            req.body = { targetUserId: 'u', newRole: 'admin' };
            mockBuilder.auth.admin.updateUserById.mockResolvedValue({ error: null });
            // DB fail
            mockBuilder.update.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: { message: "DBErr" } }) });

            await AuthController.changeUserRole(req, res);
            expect(res.statusCode).toBe(500);
        });
    });
});