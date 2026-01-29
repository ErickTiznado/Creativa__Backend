
import { jest } from '@jest/globals';

describe('Test Controller', () => {
    let testPost;
    let req, res;

    beforeAll(async () => {
        const controller = await import('../controllers/test.controller');
        testPost = controller.default;
    });

    beforeEach(() => {
        req = {
            body: { foo: 'bar' }
        };
        res = {
            json: jest.fn()
        };
    });

    test('testPost should echo back the body data', () => {
        testPost(req, res);

        expect(res.json).toHaveBeenCalledWith({
            message: "Post Exitoso",
            data: JSON.stringify(req.body)
        });
    });
});
