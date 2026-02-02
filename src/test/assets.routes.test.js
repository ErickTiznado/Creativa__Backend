
import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('nicola-framework', () => ({
    Remote: class {
        constructor() {
            this.routes = [];
        }
        get(path, handler) { this.routes.push({ method: 'GET', path, handler }); }
        patch(path, handler) { this.routes.push({ method: 'PATCH', path, handler }); }
        delete(path, handler) { this.routes.push({ method: 'DELETE', path, handler }); }
    }
}));

jest.unstable_mockModule('../controllers/assets.controller.js', () => ({
    getAssets: jest.fn(),
    updateAsset: jest.fn(),
    deleteAsset: jest.fn()
}));

describe('Assets Routes', () => {
    let assetsRoutes;
    let getAssets;

    beforeAll(async () => {
        const controller = await import('../controllers/assets.controller.js');
        getAssets = controller.getAssets;
        const routes = await import('../routes/assets.routes.js');
        assetsRoutes = routes.default;
    });

    test('should define GET / route', () => {
        const route = assetsRoutes.routes.find(r => r.method === 'GET' && r.path === '/');
        expect(route).toBeDefined();
        expect(route.handler).toBe(getAssets);
    });
});
