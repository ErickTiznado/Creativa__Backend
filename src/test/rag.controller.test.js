// src/test/rag.controller.test.js

// 1. IMPORTAR CONTROLADOR
import { ingestManual, querySearch } from '../controllers/rag.controller.js';

// 2. IMPORTAR DEPENDENCIAS (Solo para referenciarlas)
import { extractTextFromPdf } from '../services/PdfService.js';
import { chunkText } from '../services/ChunkingService.js';
import VectorCore from '../services/VectorCore.js';
import BrandManualVectorsModel from '../model/brand_manual_vectors.model.js';
// OJO: Respetamos el nombre del archivo tal cual lo tienes (QuerySearchServise)
import { brand_manual_vectors } from '../services/QuerySearchServise.js';

// --- MOCKS BLINDADOS (FACTORY PATTERN) ---

// Mock de PdfService (Evita error import.meta)
jest.mock('../services/PdfService.js', () => ({
    extractTextFromPdf: jest.fn()
}));

// Mock de ChunkingService
jest.mock('../services/ChunkingService.js', () => ({
    chunkText: jest.fn()
}));

// Mock de VectorCore (Export Default)
jest.mock('../services/VectorCore.js', () => ({
    __esModule: true,
    default: {
        embed: jest.fn()
    }
}));

// Mock del Modelo (Export Default)
jest.mock('../model/brand_manual_vectors.model.js', () => ({
    __esModule: true,
    default: {
        create: jest.fn()
    }
}));

// Mock del Servicio de Búsqueda
jest.mock('../services/QuerySearchServise.js', () => ({
    brand_manual_vectors: jest.fn()
}));

// --- SUITE DE PRUEBAS ---
describe('RagController (Ingesta y Búsqueda)', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock básico de Request y Response
        req = {
            files: {},
            body: {}
        };

        res = {
            statusCode: 200,
            end: jest.fn() // Usamos end() porque tu código no usa json() aquí
        };
    });

    // ===============================================================
    // TESTS DE INGESTA (ingestManual)
    // ===============================================================
    describe('ingestManual', () => {
        test('Debe devolver 400 si no hay archivo', async () => {
            req.files = {}; 
            await ingestManual(req, res);
            expect(res.statusCode).toBe(400);
            expect(res.end).toHaveBeenCalledWith("No se ha proporcionado ningun archivo");
        });

        test('Debe devolver 500 si falla la extracción del PDF', async () => {
            req.files = { manual: { data: 'fake-buffer', name: 'test.pdf' } };
            
            // Simulamos fallo en PdfService
            extractTextFromPdf.mockResolvedValue(null);

            await ingestManual(req, res);
            expect(res.statusCode).toBe(500);
            expect(res.end).toHaveBeenCalledWith("Error al procesar el archivo PDF");
        });

        test('Debe procesar el PDF y guardar vectores (Happy Path)', async () => {
            req.files = { manual: { data: 'buffer', name: 'manual.pdf', type: 'pdf' } };

            // Configurar mocks exitosos
            extractTextFromPdf.mockResolvedValue({ fullText: 'Texto completo', totalPages: 5, info: {} });
            chunkText.mockReturnValue(['Chunk 1']);
            VectorCore.embed.mockResolvedValue([0.1, 0.2]);
            BrandManualVectorsModel.create.mockResolvedValue(true);

            await ingestManual(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.end).toHaveBeenCalledWith("Proceso completado exitosamente");
            expect(BrandManualVectorsModel.create).toHaveBeenCalled();
        });

        test('Debe reportar errores parciales si algún chunk falla', async () => {
            req.files = { manual: { data: 'buffer', name: 'manual.pdf' } };

            extractTextFromPdf.mockResolvedValue({ fullText: 'Texto', totalPages: 1, info: {} });
            chunkText.mockReturnValue(['Chunk Bueno', 'Chunk Malo']);

            // VectorCore falla en la segunda llamada
            VectorCore.embed
                .mockResolvedValueOnce([0.1]) // 1ro bien
                .mockRejectedValueOnce(new Error("IA Error")); // 2do mal

            await ingestManual(req, res);

            // Código 200 pero mensaje de error parcial
            expect(res.statusCode).toBe(200);
            expect(res.end).toHaveBeenCalledWith(expect.stringContaining("Proceso completado con 1 errores"));
        });
    });

    // ===============================================================
    // TESTS DE BÚSQUEDA (querySearch)
    // ===============================================================
    describe('querySearch', () => {
        test('Debe devolver 400 si la query es muy corta', async () => {
            req.body = { query: 'abc' }; // 3 caracteres (muy poco)
            
            await querySearch(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.end).toHaveBeenCalledWith("La consulta debe tener al menos 4 caracteres");
        });

        test('Debe devolver mensaje si no encuentra nada', async () => {
            req.body = { query: 'buscar algo inexistente' };

            // 1. Embed exitoso
            VectorCore.embed.mockResolvedValue([0.5, 0.5]);
            // 2. Búsqueda devuelve vacío
            brand_manual_vectors.mockResolvedValue([]); 

            await querySearch(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.end).toHaveBeenCalledWith("No se encontró información relevante");
        });

        test('Debe devolver resultados formateados si encuentra coincidencias', async () => {
            req.body = { query: 'buscar algo real' };

            // 1. Embed exitoso
            VectorCore.embed.mockResolvedValue([0.1, 0.2]);
            // 2. Búsqueda devuelve datos crudos de DB
            const mockDbResult = [
                { id: 1, content_text: 'Resultado 1', metadata: {} },
                { id: 2, content_text: 'Resultado 2', metadata: {} }
            ];
            brand_manual_vectors.mockResolvedValue(mockDbResult);

            await querySearch(req, res);

            expect(res.statusCode).toBe(200);
            
            // Verificamos que devuelve un JSON String con solo content_text
            const expectedJson = JSON.stringify([
                { content_text: 'Resultado 1' },
                { content_text: 'Resultado 2' }
            ]);
            expect(res.end).toHaveBeenCalledWith(expectedJson);
        });

        test('Debe devolver 500 si ocurre un error interno', async () => {
            req.body = { query: 'error provocado' };
            
            // Simulamos error en VectorCore
            VectorCore.embed.mockRejectedValue(new Error("Fallo IA"));

            await querySearch(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.end).toHaveBeenCalledWith("Error al procesar la búsqueda");
        });
    });
});