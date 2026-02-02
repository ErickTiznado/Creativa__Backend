import { jest } from '@jest/globals';

// 1. MOCK VERTEX AI
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
    generateContent: mockGenerateContent
}));

jest.unstable_mockModule('@google-cloud/vertexai', () => ({
    VertexAI: jest.fn(() => ({
        getGenerativeModel: mockGetGenerativeModel
    }))
}));

// 2. MOCK AXIOS & FS
jest.unstable_mockModule('axios', () => ({
    default: { get: jest.fn() }
}));

jest.unstable_mockModule('fs/promises', () => ({
    default: { readFile: jest.fn() },
    readFile: jest.fn()
}));

// 3. IMPORT SERVICE
const { default: GeminiService } = await import('../services/GeminiService.js');

// 4. SUITE
describe('GeminiService (ESM)', () => {

    beforeEach(() => {
        jest.clearAllMocks();

        // Manual Injection because constructor skips init in 'test' env
        GeminiService.textModel = {
            generateContent: mockGenerateContent
        };
        GeminiService.imageModel = {
            generateContent: mockGenerateContent
        };
    });

    describe('enhanceBrief', () => {
        test('Debe retornar brief mejorado', async () => {
            const mockResponse = {
                response: {
                    candidates: [{
                        content: { parts: [{ text: "Enhanced Brief" }] }
                    }]
                }
            };
            mockGenerateContent.mockResolvedValue(mockResponse);

            const result = await GeminiService.enhanceBrief("Simple brief", "style");

            expect(result).toBe("Enhanced Brief");
            expect(mockGenerateContent).toHaveBeenCalled();
        });

        test('Debe manejar retorno vacío', async () => {
            mockGenerateContent.mockResolvedValue({ response: { candidates: [] } });
            const result = await GeminiService.enhanceBrief("Orig", "s");
            expect(result).toBe("Orig");
        });

        test('Debe manejar errores', async () => {
            mockGenerateContent.mockRejectedValue(new Error("Vertex Fail"));
            const result = await GeminiService.enhanceBrief("Orig", "s");
            expect(result).toBe("Orig"); // Fallback
        });
    });

    describe('optimizeForImageModel', () => {
        test('Debe traducir prompt', async () => {
            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [{ content: { parts: [{ text: "English Prompt" }] } }]
                }
            });

            const result = await GeminiService.optimizeForImageModel("Prompt Español");
            expect(result).toBe("English Prompt");
        });
    });

    describe('generateImages', () => {
        test('Debe generar imagenes exitosamente', async () => {
            // Mock response with inlineData (Image)
            const mockImgData = Buffer.from("fake-image").toString("base64");
            const mockResponse = {
                response: {
                    candidates: [{
                        content: {
                            parts: [{ inlineData: { data: mockImgData } }]
                        }
                    }]
                }
            };
            mockGenerateContent.mockResolvedValue(mockResponse);

            const result = await GeminiService.generateImages({ prompt: "P" });

            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(Buffer);
        });

        test('Debe lanzar error si solo devuelve texto', async () => {
            const mockResponse = {
                response: {
                    candidates: [{
                        content: { parts: [{ text: "Lo siento, no puedo..." }] }
                    }]
                }
            };
            mockGenerateContent.mockResolvedValue(mockResponse);

            await expect(GeminiService.generateImages({ prompt: "P" }))
                .rejects.toThrow("Gemini respondió solo texto");
        });
    });

    describe('refineImage', () => {
        test('Debe refinar imagen', async () => {
            const mockImgParts = [{ inlineData: { data: "base64", mimeType: "image/png" } }];

            const mockResponse = {
                response: {
                    candidates: [{
                        content: { parts: [{ inlineData: { data: "updated-base64" } }] }
                    }]
                }
            };
            mockGenerateContent.mockResolvedValue(mockResponse);

            const result = await GeminiService.refineImage("Make it pop", mockImgParts);

            expect(result.buffer).toBeInstanceOf(Buffer);
        });
    });
});
