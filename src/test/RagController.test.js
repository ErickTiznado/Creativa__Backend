import { jest } from '@jest/globals';

// 1. MOCKS CON unstable_mockModule
jest.unstable_mockModule('../services/PdfService.js', () => ({
    extractTextFromPdf: jest.fn()
}));

jest.unstable_mockModule('../services/ChunkingService.js', () => ({
    chunkText: jest.fn()
}));

jest.unstable_mockModule('../services/VectorCore.js', () => ({
    __esModule: true,
    default: { embed: jest.fn() }
}));

jest.unstable_mockModule('../model/brand_manual_vectors.model.js', () => ({
    __esModule: true,
    default: { create: jest.fn() }
}));

// 2. IMPORTS DINÁMICOS
// Importante: Usamos el nombre del archivo tal cual lo definiste
const { ingestManual } = await import('../controllers/RagController.js');
const { extractTextFromPdf } = await import('../services/PdfService.js');
const { chunkText } = await import('../services/ChunkingService.js');
const VectorCore = (await import('../services/VectorCore.js')).default;
const BrandManualVectorsModel = (await import('../model/brand_manual_vectors.model.js')).default;

// 3. SUITE
describe('RagController - Ingesta (ESM)', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = { files: { manual: { name: 'manual.pdf', data: Buffer.from('data') } } };
        res = { statusCode: 200, end: jest.fn() };
    });

    test('Debe procesar PDF y guardar vectores', async () => {
        extractTextFromPdf.mockResolvedValue({ fullText: 'Hola', totalPages: 1, info: {} });
        chunkText.mockReturnValue(['Hola']);
        VectorCore.embed.mockResolvedValue([0.1, 0.2]);
        BrandManualVectorsModel.create.mockResolvedValue(true);

        await ingestManual(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.end).toHaveBeenCalledWith("Proceso completado exitosamente");
        expect(BrandManualVectorsModel.create).toHaveBeenCalled();
    });
});