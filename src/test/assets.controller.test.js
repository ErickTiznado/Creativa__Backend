
import { jest } from '@jest/globals';

jest.unstable_mockModule("../model/assets.model.js", () => ({
    default: {
        select: jest.fn().mockReturnThis(),
        get: jest.fn()
    }
}));

describe('Assets Controller', () => {
    let getAssets;
    let Assets;
    let req, res;

    beforeAll(async () => {
        const assetsModel = await import("../model/assets.model.js");
        Assets = assetsModel.default;
        const controller = await import('../controllers/assets.controller');
        getAssets = controller.getAssets;
    });

    beforeEach(() => {
        req = {};
        res = {
            statusCode: 200,
            json: jest.fn(),
            end: jest.fn()
        };
        jest.clearAllMocks();
    });

    test('getAssets should return 200 and data on success', async () => {
        const mockData = [{ id: 1, name: 'asset1' }];
        Assets.get.mockResolvedValue(mockData);

        await getAssets(req, res);

        expect(Assets.select).toHaveBeenCalled();
        expect(Assets.get).toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
        expect(res.json).toHaveBeenCalledWith({
            message: "Ok",
            data: mockData,
            success: true
        });
    });

    test('getAssets should return 500 on error', async () => {
        const errorMsg = "Database error";
        Assets.get.mockRejectedValue(new Error(errorMsg));

        await getAssets(req, res);

        expect(res.statusCode).toBe(500);
        expect(res.json).toHaveBeenCalledWith({
            message: "Error al obtener los assets",
            error: errorMsg,
            success: false
        });
    });
});
