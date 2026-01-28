import { jest } from '@jest/globals';

// ------------------------------------------------------------------
// 1. MOCKS DE LIBRERÍAS NATIVAS Y EXTERNAS
// ------------------------------------------------------------------

// A. Mock de 'url' y 'path'
jest.unstable_mockModule('url', () => ({
    __esModule: true,
    fileURLToPath: jest.fn(() => '/mocked/path/file.js')
}));

jest.unstable_mockModule('path', () => ({
    dirname: jest.fn(() => '/mocked/path'),
    join: jest.fn(() => '/mocked/path/creativa-key.json'),
    resolve: jest.fn(() => '/mocked/path'),
    sep: '/',
    default: { dirname: jest.fn(), join: jest.fn() }
}));

// Mock Sharp
const mockSharpResize = jest.fn().mockReturnThis();
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
        get: jest.fn((url) => {
            if (url.includes('rag/getManualVectors')) {
                return Promise.resolve({
                    data: [{
                        embedding: [0.1, 0.2, 0.3],
                        metadata: JSON.stringify({ brandId: 'u1' }),
                        content: "Guidelines"
                    }]
                });
            }
            return Promise.resolve({ data: Buffer.from('fake-img') });
        })
    }
}));

// Mock Google Storage
const mockFile = { save: jest.fn().mockResolvedValue(true) };
jest.unstable_mockModule('@google-cloud/storage', () => ({
    Storage: jest.fn().mockImplementation(() => ({
        bucket: jest.fn(() => ({ file: jest.fn(() => mockFile) }))
    }))
}));

// Mock Google Vertex AI (Gemini)
// Nota: GeminiService lo usa, pero el Controller TAMBIEN lo usa directamente en generateImages
let mockGeminiResponse = {
    response: { candidates: [{ content: { parts: [{ text: "ok", inlineData: { data: 'b64' } }] } }] }
};
const mockGenerateContent = jest.fn().mockImplementation(() => Promise.resolve(mockGeminiResponse));
jest.unstable_mockModule('@google-cloud/vertexai', () => ({
    VertexAI: jest.fn().mockImplementation(() => ({
        preview: {
            getGenerativeModel: jest.fn().mockReturnValue({
                generateContent: mockGenerateContent
            })
        },
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: mockGenerateContent
        })
    }))
}));

// Mock UUID
jest.unstable_mockModule('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid')
}));

// Mock Nicola Framework (Por si se cuela alguna referencia, aunque vamos a mockear los servicios)
jest.unstable_mockModule('nicola-framework', () => ({
    Dynamo: { Model: class { } },
    PatternBuilder: jest.fn(() => ({
        startOfLine: jest.fn().mockReturnThis(),
        digit: jest.fn().mockReturnThis(),
        oneOrMore: jest.fn().mockReturnThis(),
        find: jest.fn().mockReturnThis(),
        endOfLine: jest.fn().mockReturnThis(),
        matches: jest.fn().mockReturnValue(true)
    }))
}));

// ------------------------------------------------------------------
// 2. MOCKS DE SERVICIOS INTERNOS
// ------------------------------------------------------------------

// ValidationService
jest.unstable_mockModule('../services/ValidationService.js', () => {
    class ValidationError extends Error {
        constructor(message, statusCode) {
            super(message);
            this.name = 'ValidationError';
            this.statusCode = statusCode || 400;
            this.code = 'VALIDATION_ERROR';
        }
    }

    return {
        default: {
            validateRequest: jest.fn((body, user) => ({
                brief: body.brief || "brief",
                style: body.style || "style",
                dimensions: body.dimensions || "1024x1024",
                variations: 1,
                brandId: user.userId
            })),
            validateImageGenerationRequest: jest.fn((body) => ({
                prompt: body.prompt || "User Prompt",
                aspectRatio: body.aspectRatio || "1:1",
                sampleCount: 1,
                campaignId: "C1"
            })),
            sanitizeInput: jest.fn(x => x),
            ValidationError: ValidationError
        },
        ValidationError: ValidationError
    };
});

// PromptBuilder
jest.unstable_mockModule('../services/PromptBuilder.js', () => ({
    default: {
        build: jest.fn(() => "Optimized Prompt"),
    }
}));

// VectorCore
jest.unstable_mockModule('../services/VectorCore.js', () => ({
    default: {
        embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3])
    }
}));

// QuerySearchServise
jest.unstable_mockModule('../services/QuerySearchServise.js', () => ({
    brand_manual_vectors: {
        query: jest.fn(() => ({
            vector: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue([])
        }))
    }
}));

// GeminiService
jest.unstable_mockModule('../services/GeminiService.js', () => ({
    default: {
        enhanceBrief: jest.fn((brief) => Promise.resolve(brief + " enhanced")),
        optimizeForImageModel: jest.fn((prompt) => Promise.resolve("Translated Prompt"))
    }
}));

// CampaignAsset Model
jest.unstable_mockModule('../model/CampaignAsset.model.js', () => ({
    default: {
        create: jest.fn().mockResolvedValue({ id: 1 }),
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue([])
    }
}));


// ------------------------------------------------------------------
// 3. IMPORTACIONES DINÁMICAS
// ------------------------------------------------------------------
const { default: GeneratorController } = await import('../controllers/GeneratorController.js');
const CampaignAsset = (await import('../model/CampaignAsset.model.js')).default;
const axios = (await import('axios')).default;
const ValidationService = (await import('../services/ValidationService.js')).default;

// ------------------------------------------------------------------
// 4. SUITE DE PRUEBAS
// ------------------------------------------------------------------
describe('GeneratorController (ESM)', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSharpResize.mockClear();

        // Reset Gemini Mock Response
        mockGeminiResponse.response = { candidates: [{ content: { parts: [{ text: "ok", inlineData: { data: 'b64' } }] } }] };

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

            await GeneratorController.saveToStorage(req, res);

            expect(res.statusCode).toBe(201);
            expect(mockSharpResize).toHaveBeenCalledWith(300);
        });

        test('Falla si no hay campaña', async () => {
            req = { body: {}, files: {} };
            await GeneratorController.saveToStorage(req, res);
            expect(res.statusCode).toBe(400);
        });
    });

    describe('refineAsset', () => {
        test('Fusiona correctamente', async () => {
            req = { body: { assetIds: ["A1"], refinementPrompt: "F" } };

            // Mock asset lookup
            CampaignAsset.where().get.mockResolvedValue([{
                id: "A1",
                img_url: { url: "http://x.com/img.png" },
                campaign_assets: "C1"
            }]);

            await GeneratorController.refineAsset(req, res);
            expect(res.statusCode).toBe(200);
        });

        test('Maneja error de red en axios', async () => {
            axios.get.mockRejectedValueOnce(new Error("Net Error"));
            req = { body: { assetIds: ["A1"], refinementPrompt: "F" } };
            CampaignAsset.where().get.mockResolvedValue([{ id: "A1", img_url: { url: "http://x.com" }, campaign_assets: "C1" }]);

            await GeneratorController.refineAsset(req, res);
            expect(res.statusCode).toBe(500);
        });
    });

    describe('buildPrompt', () => {
        test('Genera prompt optimizado', async () => {
            req = {
                body: { brief: "Foto", style: "Cinematic" },
                user: { userId: "u1" }
            };

            await GeneratorController.buildPrompt(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ prompt: "Optimized Prompt" })
            }));
        });

        test('Maneja error de validación', async () => {
            req = { body: {}, user: {} };
            const ValError = ValidationService.ValidationError;
            ValidationService.validateRequest.mockImplementationOnce(() => {
                throw new ValError("Invalid", 400);
            });

            await GeneratorController.buildPrompt(req, res);
            expect(res.statusCode).toBe(400);
        });
    });

    describe('generateImages', () => {
        test('Genera y guarda imagenes con flujo RAG completo', async () => {
            req = {
                body: { prompt: "Una foto", style: "Cinematic" },
                user: { userId: "u1" } // Auth user mock
            };

            await GeneratorController.generateImages(req, res);

            expect(res.statusCode).toBe(200);

            // 1. Verifica mejora de brief
            // Nota: ValidationService mock devuelve brief default si no se pasa, aqui pasamos prompt -> brief
            // Pero en validateImageGenerationRequest devolvemos prompt: body.prompt.
            // En el controller: const { prompt... } = validatedData.

            // 2. Verifica RAG call (Internal Helper -> Axios)
            expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('rag/getManualVectors'));

            // 3. Verifica generación final
            expect(mockGenerateContent).toHaveBeenCalled();

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    metadata: expect.objectContaining({
                        ragRelevance: expect.anything()
                    })
                })
            }));
        });
    });
});