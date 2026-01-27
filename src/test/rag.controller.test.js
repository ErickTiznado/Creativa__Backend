import { jest } from '@jest/globals';

// ------------------------------------------------------------------
// 1. MOCKS
// ------------------------------------------------------------------

// PdfService
jest.unstable_mockModule('../services/PdfService.js', () => ({
    extractTextFromPdf: jest.fn(),
    default: { extractTextFromPdf: jest.fn() }
}));

// ChunkingService
jest.unstable_mockModule('../services/ChunkingService.js', () => ({
    chunkText: jest.fn()
}));

// VectorCore
// El controller usa: import VectorCore from "../services/VectorCore.js";
// Y llama: await VectorCore.embed(c);
const mockEmbed = jest.fn();
jest.unstable_mockModule('../services/VectorCore.js', () => ({
    default: {
        embed: mockEmbed
    }
}));

// BrandManualVectorsModel
const mockCreate = jest.fn();
jest.unstable_mockModule('../model/brand_manual_vectors.model.js', () => ({
    default: {
        create: mockCreate
    }
}));

// QuerySearchServise
// El controller usa: import { brand_manual_vectors } from "../services/QuerySearchServise.js";
const mockBrandManualVectors = jest.fn();
jest.unstable_mockModule('../services/QuerySearchServise.js', () => ({
    brand_manual_vectors: mockBrandManualVectors
}));

// ------------------------------------------------------------------
// 2. IMPORTS
// ------------------------------------------------------------------
const { ingestManual, querySearch } = await import('../controllers/rag.controller.js');
const { extractTextFromPdf } = await import('../services/PdfService.js');
const { chunkText } = await import('../services/ChunkingService.js');

// ------------------------------------------------------------------
// 3. SUITE
// ------------------------------------------------------------------
describe('RAG Controller Legacy (ESM)', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = { body: {}, files: {} };
        res = {
            statusCode: 200,
            end: jest.fn(),
            json: jest.fn()
        };

        // Default sucessful mocks
        mockEmbed.mockResolvedValue([0.1, 0.2]);
        mockCreate.mockResolvedValue(true);
        mockBrandManualVectors.mockResolvedValue([]);
    });

    describe('ingestManual', () => {
        test('Debe procesar PDF exitosamente', async () => {
            req.files = { manual: { data: 'd', name: 'm.pdf', type: 'application/pdf' } };

            extractTextFromPdf.mockResolvedValue({ fullText: "Texto", totalPages: 1, info: {} });
            chunkText.mockReturnValue(["chunk1"]);

            await ingestManual(req, res);

            expect(mockEmbed).toHaveBeenCalled();
            expect(mockCreate).toHaveBeenCalled();
            expect(res.statusCode).toBe(200);
            expect(res.end).toHaveBeenCalledWith("Proceso completado exitosamente");
        });

        test('Debe fallar si no hay archivo', async () => {
            req.files = {};
            await ingestManual(req, res);
            expect(res.statusCode).toBe(400);
            expect(res.end).toHaveBeenCalledWith(expect.stringContaining("No se ha proporcionado"));
        });

        test('Debe fallar si extracción PDF retorna null', async () => {
            req.files = { manual: { data: 'd' } };
            extractTextFromPdf.mockResolvedValue(null);

            await ingestManual(req, res);
            expect(res.statusCode).toBe(500);
            expect(res.end).toHaveBeenCalledWith("Error al procesar el archivo PDF");
        });

        test('Debe reportar errores parciales', async () => {
            req.files = { manual: { data: 'd' } };
            extractTextFromPdf.mockResolvedValue({ fullText: "T", totalPages: 1 });
            chunkText.mockReturnValue(["c1"]);

            mockEmbed.mockRejectedValue(new Error("Fail Emb"));

            await ingestManual(req, res);

            expect(res.end).toHaveBeenCalledWith(expect.stringContaining("con 1 errores"));
        });
    });

    describe('querySearch', () => {
        test('Debe devolver resultados si existen', async () => {
            req.body = { query: "test query" }; // > 3 chars

            mockBrandManualVectors.mockResolvedValue([{ content_text: "Encontrado" }]);

            await querySearch(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.end).toHaveBeenCalledWith(expect.stringContaining("Encontrado"));
        });

        test('Debe manejar sin resultados', async () => {
            req.body = { query: "test query" };
            mockBrandManualVectors.mockResolvedValue([]);

            await querySearch(req, res);

            expect(res.end).toHaveBeenCalledWith("No se encontró información relevante");
        });

        test('Debe validar longitud de query', async () => {
            req.body = { query: "hi" }; // Corto
            await querySearch(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.end).toHaveBeenCalledWith(expect.stringContaining("debe tener al menos 4"));
        });

        test('Debe manejar error interno', async () => {
            req.body = { query: "boom" };
            mockEmbed.mockRejectedValue(new Error("Generic Error"));

            await querySearch(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.end).toHaveBeenCalledWith("Error al procesar la búsqueda");
        });
    });
});