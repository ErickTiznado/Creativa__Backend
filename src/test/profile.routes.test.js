
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

jest.unstable_mockModule('../controllers/profiles.controller', () => ({
    getDesigners: jest.fn()
}));

describe('Profile Routes', () => {
    let profileRoutes;
    let getDesigners;

    beforeAll(async () => {
        const controller = await import('../controllers/profiles.controller');
        getDesigners = controller.getDesigners;
        const routes = await import('../routes/profile.routes');
        profileRoutes = routes.default;
    });

    test('should define GET /designers route', () => {
        const route = profileRoutes.routes.find(r => r.method === 'GET' && r.path === '/designers');
        expect(route).toBeDefined();
        expect(route.handler).toBe(getDesigners);
    });
});
