
import { jest } from '@jest/globals';

// Mocks
jest.unstable_mockModule('../services/SupabaseClient', () => ({
    supabase: {
        schema: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
    }
}));

describe('roleMiddleware - requireRole', () => {
    let requireRole;
    let supabase;
    let req, res, next;

    beforeAll(async () => {
        const supabaseModule = await import('../services/SupabaseClient');
        supabase = supabaseModule.supabase;
        const middleware = await import('../middlewares/roleMiddleware.js');
        requireRole = middleware.requireRole;
    });

    beforeEach(() => {
        req = {
            user: { userId: '123' }
        };
        res = {
            statusCode: 200,
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('should return 401 if user is not authenticated', async () => {
        req.user = null;
        const middleware = requireRole(['admin']);
        await middleware(req, res, next);

        expect(res.statusCode).toBe(401);
        expect(res.json).toHaveBeenCalledWith({ error: "No autenticado (RoleMiddleware)" });
        expect(next).not.toHaveBeenCalled();
    });

    test('should return 500 if database error occurs', async () => {
        supabase.single.mockResolvedValue({ data: null, error: { message: "DB Error" } });

        const middleware = requireRole(['admin']);
        await middleware(req, res, next);

        expect(res.statusCode).toBe(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Error al verificar permisos" });
        expect(next).not.toHaveBeenCalled();
    });

    test('should return 500 if profile is not found', async () => {
        supabase.single.mockResolvedValue({ data: null, error: null });

        const middleware = requireRole(['admin']);
        await middleware(req, res, next);

        expect(res.statusCode).toBe(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Error al verificar permisos" });
        expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 if user role is not allowed', async () => {
        supabase.single.mockResolvedValue({ data: { role: 'user' }, error: null });

        const middleware = requireRole(['admin']);
        await middleware(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "No tienes permisos para realizar esta acción"
        }));
        expect(next).not.toHaveBeenCalled();
    });

    test('should call next if user role is allowed', async () => {
        supabase.single.mockResolvedValue({ data: { role: 'admin' }, error: null });

        const middleware = requireRole(['admin', 'moderator']);
        await middleware(req, res, next);

        expect(req.userRole).toBe('admin');
        expect(next).toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
    });
});
