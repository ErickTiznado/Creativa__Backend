
import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('nicola-framework', () => ({
    Remote: class {
        constructor() {
            this.routes = [];
        }
        get(path, handler) {
            this.routes.push({ method: 'GET', path, handler });
        }
    }
}));

jest.unstable_mockModule('../controllers/assets.controller', () => ({
    getAssets: jest.fn()
}));

describe('Assets Routes', () => {
    let assetsRoutes;
    let getAssets;

    beforeAll(async () => {
        const controller = await import('../controllers/assets.controller');
        getAssets = controller.getAssets;
        const routes = await import('../routes/assets.routes');
        assetsRoutes = routes.default;
    });

    test('should define GET / route', () => {
        const route = assetsRoutes.routes.find(r => r.method === 'GET' && r.path === '/');
        expect(route).toBeDefined();
        expect(route.handler).toBe(getAssets);
    });
});
