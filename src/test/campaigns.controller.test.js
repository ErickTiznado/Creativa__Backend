import { jest } from '@jest/globals';

// 1. MOCKS
jest.unstable_mockModule('../model/Brief.model.js', () => ({
    default: {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn(),
        update: jest.fn()
    }
}));

// 2. IMPORTS
const { getCampaigns, getCampaignsDesigners, updateStateCampaign, getCampaingById } = await import('../controllers/campaigns.controller.js');
const { default: Brief } = await import('../model/Brief.model.js');

// 3. SUITE
describe('CampaignsController (ESM)', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = { query: {}, body: {} };
        res = { statusCode: 200, json: jest.fn() };
        // Reset chains
        Brief.select.mockReturnThis();
        Brief.where.mockReturnThis();
        Brief.update.mockReturnThis();
    });

    describe('getCampaigns', () => {
        test('Debe devolver campañas con éxito', async () => {
            const mockData = [{ id: 1 }];
            Brief.get.mockResolvedValue(mockData);

            await getCampaigns(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: mockData }));
        });

        test('Debe manejar errores', async () => {
            Brief.get.mockRejectedValue(new Error("Fail"));
            await getCampaigns(req, res);
            expect(res.statusCode).toBe(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
        });
    });

    describe('getCampaignsDesigners', () => {
        test('Debe devolver 400 si falta designerId', async () => {
            req.query = {}; // Sin designerId
            await getCampaignsDesigners(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: "No se proporciono un id de diseñador" }));
        });

        test('Debe devolver campañas del diseñador', async () => {
            req.query = { designerId: 'd1' };
            const mockData = [{ id: 2 }];
            Brief.get.mockResolvedValue(mockData);

            await getCampaignsDesigners(req, res);

            expect(Brief.where).toHaveBeenCalledWith("designer_id", 'd1');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: mockData }));
        });

        test('Debe manejar errores en campaignsDesigners', async () => {
            req.query = { designerId: 'd1' };
            Brief.get.mockRejectedValue(new Error("Fail"));
            await getCampaignsDesigners(req, res);
            expect(res.statusCode).toBe(500);
        });
    });

    describe('updateStateCampaign', () => {
        test('Debe devolver 400 si faltan datos', async () => {
            req.body = { campaignId: '', status: '' };
            await updateStateCampaign(req, res);
            expect(res.statusCode).toBe(400);
        });

        test('Debe actualizar estado correctamente', async () => {
            req.body = { campaignId: 'c1', status: 'active' };
            Brief.update.mockResolvedValue(true);

            await updateStateCampaign(req, res);

            expect(Brief.where).toHaveBeenCalledWith("id", 'c1');
            expect(Brief.update).toHaveBeenCalledWith({ status: 'active' });
            expect(res.statusCode).toBe(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        test('Debe manejar errores en update', async () => {
            req.body = { campaignId: 'c1', status: 'active' };
            Brief.update.mockRejectedValue(new Error("Fail"));
            await updateStateCampaign(req, res);
            expect(res.statusCode).toBe(500);
        });
    });

    describe('getCampaingById', () => {
        test('Debe devolver 400 si faltan params', async () => {
            req.query = { campaignId: 'c1' }; // Falta designerId
            await getCampaingById(req, res);
            expect(res.statusCode).toBe(400);
        });

        test('Debe devolver campaña por ID', async () => {
            req.query = { campaignId: 'c1', designerId: 'd1' };
            const mockData = [{ id: 'c1' }];
            Brief.get.mockResolvedValue(mockData);

            await getCampaingById(req, res);

            expect(Brief.where).toHaveBeenCalledWith("id", 'c1');
            expect(Brief.where).toHaveBeenCalledWith("designer_id", 'd1');
            expect(res.statusCode).toBe(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: mockData }));
        });

        test('Debe manejar errores en getById', async () => {
            req.query = { campaignId: 'c1', designerId: 'd1' };
            Brief.get.mockRejectedValue(new Error("Fail"));
            await getCampaingById(req, res);
            expect(res.statusCode).toBe(500);
        });
    });
});