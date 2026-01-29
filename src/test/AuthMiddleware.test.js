
import { jest } from '@jest/globals';

// Mocks
jest.unstable_mockModule('nicola-framework', () => ({
    Coherer: {
        verify: jest.fn()
    }
}));

// Global mocks for safety
jest.unstable_mockModule('@google-cloud/vertexai', () => ({
    VertexAI: class {
        getGenerativeModel() { return {}; }
    }
}));

describe('AuthMiddleware - requireAuth', () => {
    let requireAuth;
    let Coherer;
    let req, res, next;

    beforeAll(async () => {
        const nicola = await import('nicola-framework');
        Coherer = nicola.Coherer;
        const middleware = await import('../middlewares/AuthMiddleware.js');
        requireAuth = middleware.requireAuth;
    });

    beforeEach(() => {
        req = {
            headers: {}
        };
        res = {
            statusCode: 200,
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('should return 401 if no Authorization header is present', () => {
        requireAuth(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Token no proporcionado" });
        expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if Authorization header does not start with Bearer', () => {
        req.headers.authorization = "Basic 123456";
        requireAuth(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Token no proporcionado" });
        expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if token part is missing', () => {
        req.headers.authorization = "Bearer ";
        requireAuth(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Formato de token inválido" });
        expect(next).not.toHaveBeenCalled();
    });

    test('should call next and set req.user if token is valid', () => {
        req.headers.authorization = "Bearer valid.token.here";
        const mockPayload = { userId: 1, role: 'user' };
        Coherer.verify.mockReturnValue(mockPayload);

        requireAuth(req, res, next);

        expect(Coherer.verify).toHaveBeenCalledWith("valid.token.here");
        expect(req.user).toEqual(mockPayload);
        expect(next).toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
    });

    test('should return 401 if token is invalid or expired', () => {
        req.headers.authorization = "Bearer invalid.token";
        Coherer.verify.mockImplementation(() => {
            throw new Error("Invalid signature");
        });

        requireAuth(req, res, next);

        expect(res.statusCode).toBe(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Token inválido o expirado"
        }));
        expect(next).not.toHaveBeenCalled();
    });
});
