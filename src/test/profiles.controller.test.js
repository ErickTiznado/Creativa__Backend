
import { jest } from '@jest/globals';

jest.unstable_mockModule("../model/profile.model.js", () => ({
    Profile: {
        where: jest.fn().mockReturnThis(),
        get: jest.fn()
    }
}));

describe('Profiles Controller', () => {
    let getDesigners;
    let Profile;
    let req, res;

    beforeAll(async () => {
        const profileModel = await import("../model/profile.model.js");
        Profile = profileModel.Profile;
        const controller = await import('../controllers/profiles.controller');
        getDesigners = controller.getDesigners;
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

    test('getDesigners should return 200 and data on success', async () => {
        const mockData = [{ id: 1, role: 'designer' }];
        Profile.get.mockResolvedValue(mockData);

        await getDesigners(req, res);

        expect(Profile.where).toHaveBeenCalledWith("role", "designer");
        expect(Profile.get).toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
        expect(res.json).toHaveBeenCalledWith(mockData);
    });

    test('getDesigners should return 500 on error', async () => {
        const errorMsg = "Database error";
        Profile.get.mockRejectedValue(new Error(errorMsg));

        await getDesigners(req, res);

        expect(res.statusCode).toBe(500);
        expect(res.end).toHaveBeenCalledWith(expect.any(Error));
    });
});
