
import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('nicola-framework', () => ({
    Remote: class {
        constructor() {
            this.routes = [];
        }
        post(path, handler) {
            this.routes.push({ method: 'POST', path, handler });
        }
    }
}));

jest.unstable_mockModule('../controllers/test.controller', () => ({ default: jest.fn() }));

describe('Test Routes', () => {
    let testRoutes, testPost;

    beforeAll(async () => {
        const controller = await import('../controllers/test.controller');
        testPost = controller.default;
        const routes = await import('../routes/test.routes');
        testRoutes = routes.default;
    });

    test('should define POST /test route', () => {
        const route = testRoutes.routes.find(r => r.method === 'POST' && r.path === '/test');
        expect(route).toBeDefined();
        expect(route.handler).toBe(testPost);
    });
});
