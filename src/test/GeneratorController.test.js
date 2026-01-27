import { jest } from '@jest/globals';

// --- VARIABLES DE CONTROL ---
let mockGeminiResponse;
const mockSharpResize = jest.fn().mockReturnThis();

// ------------------------------------------------------------------
// 1. MOCKS DE LIBRERÍAS NATIVAS (LA SOLUCIÓN REAL)
// ------------------------------------------------------------------
// Al mockear esto, evitamos que el controlador ejecute lógica real de sistema
// de archivos que entra en conflicto con Jest/ESM.

// A. Mock de 'url' (Soporta import { fileURLToPath } from 'url')
jest.unstable_mockModule('url', () => ({
    __esModule: true,
    fileURLToPath: jest.fn(() => '/mocked/path/file.js')
}));

// B. Mock de 'path' (Soporta import path from 'path')
jest.unstable_mockModule('path', () => {
    const pathMethods = {
        dirname: jest.fn(() => '/mocked/path'),
        join: jest.fn(() => '/mocked/path/creativa-key.json'),
        resolve: jest.fn(() => '/mocked/path'),
        sep: '/'
    };
    return {
        __esModule: true,
        default: pathMethods, // Para imports por defecto
        ...pathMethods        // Para destructuring imports
    };
});

// ------------------------------------------------------------------
// 2. MOCKS DE DEPENDENCIAS EXTERNAS
// ------------------------------------------------------------------

// Mock de Nicola Framework (Para evitar error en el Modelo)
jest.unstable_mockModule('nicola-framework', () => ({
    Dynamo: { Model: class { } }
}));

// Mock Modelo
jest.unstable_mockModule('../model/CampaignAsset.js', () => ({
    default: {
        create: jest.fn(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn()
    }
}));

// Mock Sharp
jest.unstable_mockModule('sharp', () => ({
    default: jest.fn(() => ({
        metadata: jest.fn().mockResolvedValue({ format: 'png' }),
        resize: mockSharpResize,
        toFormat: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-buffer'))
    }))
}));

// Mock Axios
jest.unstable_mockModule('axios', () => ({
    default: {
        get: jest.fn().mockResolvedValue({ data: Buffer.from('fake-img') })
    }
}));

// Mock Google Storage
const mockFile = { save: jest.fn().mockResolvedValue(true) };
jest.unstable_mockModule('@google-cloud/storage', () => ({
    Storage: jest.fn().mockImplementation(() => ({
        bucket: jest.fn(() => ({ file: jest.fn(() => mockFile) }))
    }))
}));

// Mock Google Vertex AI
jest.unstable_mockModule('@google-cloud/vertexai', () => ({
    VertexAI: jest.fn().mockImplementation(() => ({
        preview: {
            getGenerativeModel: jest.fn().mockReturnValue({
                generateContent: jest.fn().mockImplementation(() => Promise.resolve(mockGeminiResponse))
            })
        }
    }))
}));

// Mock UUID
jest.unstable_mockModule('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid')
}));

// ------------------------------------------------------------------
// 3. IMPORTACIONES DINÁMICAS (CRÍTICO: AL FINAL)
// ------------------------------------------------------------------
const { saveToStorage, refineAsset } = await import('../controllers/GeneratorController.js');
const CampaignAsset = (await import('../model/CampaignAsset.js')).default;
const axios = (await import('axios')).default;

// ------------------------------------------------------------------
// 4. SUITE DE PRUEBAS
// ------------------------------------------------------------------
describe('GeneratorController (ESM)', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSharpResize.mockClear();

        mockGeminiResponse = {
            response: { candidates: [{ content: { parts: [{ text: "ok", inlineData: { data: 'b64' } }] } }] }
        };

        res = {
            statusCode: 200,
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis()
        };
    });

    describe('saveToStorage', () => {
        test('Guarda correctamente', async () => {
            req = {
                body: { campaignId: "C1", prompt: "P" },
                files: { images: [{ data: Buffer.from('d'), name: 'i.png' }] }
            };
            CampaignAsset.create.mockResolvedValue({ id: 1 });

            await saveToStorage(req, res);

            expect(res.statusCode).toBe(201);
            expect(mockSharpResize).toHaveBeenCalledWith(300);
        });
    });

    describe('refineAsset', () => {
        test('Fusiona correctamente', async () => {
            req = { body: { assetIds: ["A1"], refinementPrompt: "F" } };
            CampaignAsset.where().get.mockResolvedValue([{ id: "A1", img_url: { url: "http://x.com" }, campaign_assets: "C1" }]);

            await refineAsset(req, res);
            expect(res.statusCode).toBe(200);
        });
    });

    test('Maneja error de red', async () => {
        axios.get.mockRejectedValueOnce(new Error("Net Error"));
        req = { body: { assetIds: ["A1"], refinementPrompt: "F" } };
        CampaignAsset.where().get.mockResolvedValue([{ id: "A1", img_url: "url", campaign_assets: "C1" }]);

        await refineAsset(req, res);
        expect(res.statusCode).toBe(500);
    });
});