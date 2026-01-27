import { jest } from '@jest/globals';

// 1. MOCKS
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
        req = { files: { manual: { name: 'manual.pdf', data: Buffer.from('data'), type: 'application/pdf' } } };
        res = { statusCode: 200, end: jest.fn() };
    });

    test('Debe procesar PDF y guardar vectores EXITOSAMENTE', async () => {
        extractTextFromPdf.mockResolvedValue({ fullText: 'Hola Mundo', totalPages: 1, info: {} });
        chunkText.mockReturnValue(['Hola', 'Mundo']);
        VectorCore.embed.mockResolvedValue([0.1, 0.2]);
        BrandManualVectorsModel.create.mockResolvedValue(true);

        await ingestManual(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.end).toHaveBeenCalledWith("Proceso completado exitosamente");
        expect(extractTextFromPdf).toHaveBeenCalled();
        expect(VectorCore.embed).toHaveBeenCalledTimes(2);
        expect(BrandManualVectorsModel.create).toHaveBeenCalledTimes(2);
    });

    test('Debe devolver 400 si no se envía archivo', async () => {
        req.files = null;
        await ingestManual(req, res);
        expect(res.statusCode).toBe(400);
        expect(res.end).toHaveBeenCalledWith(expect.stringContaining("No se ha proporcionado"));

        req.files = {}; // Case: files object exists but manual property missing
        await ingestManual(req, res);
        expect(res.statusCode).toBe(400);
    });

    test('Debe devolver 500 si falla la extracción de PDF', async () => {
        extractTextFromPdf.mockResolvedValue(null); // Return null on error as per controller logic

        await ingestManual(req, res);

        expect(res.statusCode).toBe(500);
        expect(res.end).toHaveBeenCalledWith("Error al procesar el archivo PDF");
    });

    test('Debe manejar errores parciales al generar embeddings y notificar al final', async () => {
        extractTextFromPdf.mockResolvedValue({ fullText: 'A B', totalPages: 1, info: {} });
        chunkText.mockReturnValue(['Chunk1', 'Chunk2']);

        // Mock implementation: First success, second fails
        VectorCore.embed
            .mockResolvedValueOnce([0.1])
            .mockRejectedValueOnce(new Error("API Error"));

        await ingestManual(req, res);

        expect(res.statusCode).toBe(200);
        // Should report error count
        expect(res.end).toHaveBeenCalledWith(expect.stringContaining("Proceso completado con 1 errores"));
    });

    test('Debe devolver éxito si hay chunks pero 0 errores (edge coverage check)', async () => {
        // Test para asegurar que el contador de errores funciona cuando es 0 explícitamente
        extractTextFromPdf.mockResolvedValue({ fullText: 'A', totalPages: 1, info: {} });
        chunkText.mockReturnValue(['Chunk1']);
        VectorCore.embed.mockResolvedValue([0.1]);

        await ingestManual(req, res);

        expect(res.end).toHaveBeenCalledWith("Proceso completado exitosamente");
    });
});