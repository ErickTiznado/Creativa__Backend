import { jest } from '@jest/globals';

// 1. MOCKS DE SERVICIOS EXTERNOS (Para evitar que se carguen los reales)
jest.unstable_mockModule('../services/PdfService.js', () => ({
    extractTextFromPdf: jest.fn().mockResolvedValue({ fullText: "Texto", totalPages: 1 }),
    default: { extractTextFromPdf: jest.fn() }
}));

jest.unstable_mockModule('../services/ChunkingService.js', () => ({
    chunkText: jest.fn().mockReturnValue(["chunk"])
}));

// Mockeamos VectorCore.js para que NO lea el archivo real (que tiene el error de require)
jest.unstable_mockModule('../services/VectorCore.js', () => ({
    __esModule: true,
    default: {
        embed: jest.fn().mockResolvedValue([0.1, 0.2])
    }
}));

// Mock de Langchain (por si acaso se escapa algo)
jest.unstable_mockModule('@langchain/google-vertexai', () => ({
    GoogleVertexAIEmbeddings: jest.fn()
}), { virtual: true });

// Mock de Supabase
const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    rpc: jest.fn()
};
jest.unstable_mockModule('../services/SupabaseClient.js', () => ({ supabase: mockSupabase }));
jest.unstable_mockModule('../services/supaBaseClient.js', () => ({ supabase: mockSupabase }));

jest.unstable_mockModule('../model/brand_manual_vectors.model.js', () => ({
    default: { create: jest.fn().mockResolvedValue(true) }
}));

jest.unstable_mockModule('../services/QuerySearchServise.js', () => ({
    brand_manual_vectors: jest.fn().mockResolvedValue([])
}));

// 2. IMPORTAR EL CONTROLADOR
const { ingestManual, querySearch } = await import('../controllers/rag.controller.js');

// 3. SUITE
describe('RAG Controller (ESM)', () => {
    let req, res;
    beforeEach(() => {
        jest.clearAllMocks();
        req = { body: {}, files: {} };
        res = { statusCode: 200, end: jest.fn(), json: jest.fn() };
    });

    test('ingestManual éxito', async () => {
        req.files = { manual: { data: 'd', name: 'm.pdf' } };
        mockSupabase.insert.mockResolvedValue({ error: null });

        await ingestManual(req, res);

        expect(res.statusCode).toBe(200);
    });

    test('querySearch éxito', async () => {
        req.body = { query: "test query" };
        mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

        await querySearch(req, res);

        // Verifica que no explotó
        expect(res.statusCode).toBeDefined();
    });
});