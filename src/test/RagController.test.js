// src/test/RagController.test.js

// 1. IMPORTAMOS TU CONTROLADOR REAL
import { ingestManual } from '../controllers/RagController.js';

// 2. IMPORTAMOS LOS SERVICIOS 
import { extractTextFromPdf } from '../services/PdfService.js';
import { chunkText } from '../services/ChunkingService.js';
import VectorCore from '../services/VectorCore.js';
import BrandManualVectorsModel from '../model/brand_manual_vectors.model.js';

// 3. MOCKEAMOS (SIMULAMOS) MANUALMENTE PARA EVITAR ERRORES DE SINTAXIS
// Al pasar una función como segundo argumento, Jest NO lee el archivo real.

// Mock para PdfService (Evita el error de createRequire/import.meta)
jest.mock('../services/PdfService.js', () => ({
    extractTextFromPdf: jest.fn()
}));

// Mock para ChunkingService
jest.mock('../services/ChunkingService.js', () => ({
    chunkText: jest.fn()
}));

// Mock para VectorCore (Manejo de export default)
jest.mock('../services/VectorCore.js', () => ({
    __esModule: true,
    default: {
        embed: jest.fn()
    }
}));

// Mock para el Modelo (Manejo de export default)
jest.mock('../model/brand_manual_vectors.model.js', () => ({
    __esModule: true,
    default: {
        create: jest.fn()
    }
}));

describe('RagController - Ingesta de Manuales', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        // Simulamos un Request con un archivo PDF
        req = {
            files: {
                manual: {
                    name: 'manual_prueba.pdf',
                    data: Buffer.from('contenido-falso')
                }
            }
        };

        // Simulamos el Response al estilo Nicola Framework
        res = {
            statusCode: 200,
            end: jest.fn() // Espía para ver qué responde
        };
    });

    // PRUEBA 1: Verificar que falla si no hay archivo
    test('Debe devolver error 400 si no se sube archivo', async () => {
        req.files = null; // Borramos el archivo simulado
        await ingestManual(req, res);
        
        expect(res.statusCode).toBe(400);
        expect(res.end).toHaveBeenCalledWith("No se ha proporcionado ningun archivo");
    });

    // PRUEBA 2: Happy Path (Todo sale bien)
    test('Debe procesar el PDF y guardar en base de datos correctamente', async () => {
        // Configuramos los mocks
        // Nota: Al haber usado la fábrica arriba, estas funciones ya son jest.fn() listas para configurarse
        extractTextFromPdf.mockResolvedValue({ fullText: 'Hola mundo', totalPages: 1, info: {} });
        chunkText.mockReturnValue(['Hola mundo']);
        
        // Para los default exports, accedemos a la propiedad que definimos en el mock
        VectorCore.embed.mockResolvedValue([0.1, 0.2, 0.3]);
        BrandManualVectorsModel.create.mockResolvedValue(true);

        // Ejecutamos el controlador
        await ingestManual(req, res);

        // Verificamos éxito
        expect(res.statusCode).toBe(200);
        expect(res.end).toHaveBeenCalledWith("Proceso completado exitosamente");
        expect(BrandManualVectorsModel.create).toHaveBeenCalled();
    });
});