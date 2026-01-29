
import { jest } from '@jest/globals';

// Mocks
jest.unstable_mockModule('nicola-framework', () => ({
    Remote: class {
        constructor() {
            this.routes = [];
        }
        post(path, ...handlers) {
            this.routes.push({ method: 'POST', path, handlers });
        }
    }
}));

jest.unstable_mockModule('../controllers/GeneratorController', () => ({
    default: {
        buildPrompt: jest.fn(),
        generateImages: jest.fn(),
        saveToStorage: jest.fn(),
        refineAsset: jest.fn()
    }
}));

jest.unstable_mockModule('../middlewares/AuthMiddleware', () => ({
    requireAuth: jest.fn()
}));

// Also mock VertexAI for GeminiService safety, as generator routes might transitively load it
jest.unstable_mockModule('@google-cloud/vertexai', () => ({
    VertexAI: class {
        getGenerativeModel() { return {}; }
    }
}));

describe('Generator Routes', () => {
    let generatorRoutes, requireAuth;

    beforeAll(async () => {
        const auth = await import('../middlewares/AuthMiddleware');
        requireAuth = auth.requireAuth;
        const routes = await import('../routes/generator.routes');
        generatorRoutes = routes.default;
    });

    test('should define POST /build-prompt route', () => {
        const route = generatorRoutes.routes.find(r => r.method === 'POST' && r.path === '/build-prompt');
        expect(route).toBeDefined();
        expect(route.handlers[0]).toBe(requireAuth);
        expect(route.handlers[1]).toBeDefined();
    });

    test('should define POST /generate-images route', () => {
        const route = generatorRoutes.routes.find(r => r.method === 'POST' && r.path === '/generate-images');
        expect(route).toBeDefined();
        expect(route.handlers[0]).toBe(requireAuth);
        expect(route.handlers[1]).toBeDefined();
    });

    test('should define POST /save-assets route', () => {
        const route = generatorRoutes.routes.find(r => r.method === 'POST' && r.path === '/save-assets');
        expect(route).toBeDefined();
        expect(route.handlers[0]).toBe(requireAuth);
        expect(route.handlers[1]).toBeDefined();
    });

    test('should define POST /refine-asset route', () => {
        const route = generatorRoutes.routes.find(r => r.method === 'POST' && r.path === '/refine-asset');
        expect(route).toBeDefined();
        expect(route.handlers[0]).toBe(requireAuth);
        expect(route.handlers[1]).toBeDefined();
    });
});
