import { jest } from '@jest/globals';

// 1. MOCK GOOGLE AIPLATFORM
const mockPredict = jest.fn();
const mockClient = jest.fn(() => ({
    predict: mockPredict
}));

const mockToValue = jest.fn((obj) => obj);

jest.unstable_mockModule('@google-cloud/aiplatform', () => ({
    default: {
        v1: { PredictionServiceClient: mockClient },
        helpers: { toValue: mockToValue }
    }
}));

// 2. IMPORT SERVICE
const { default: VectorCore } = await import('../services/VectorCore.js');

// 3. SUITE
describe('VectorCore (ESM)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Helper to build deep structure
    const buildEmbeddingResponse = (values) => {
        // [ { structValue: { fields: { embeddings: { structValue: { fields: { values: { listValue: { values: [ {numberValue: 1} ... ] } } } } } } } } ]

        const numberValues = values.map(v => ({ numberValue: v }));

        return [{
            structValue: {
                fields: {
                    embeddings: {
                        structValue: {
                            fields: {
                                values: {
                                    listValue: { values: numberValues }
                                }
                            }
                        }
                    }
                }
            }
        }];
    };

    const buildMultimodalResponse = (values, type = 'imageEmbedding') => {
        // [ { structValue: { fields: { imageEmbedding: { listValue: { values: [ {numberValue: 1} ] } } } } } ]
        const numberValues = values.map(v => ({ numberValue: v }));
        return [{
            structValue: {
                fields: {
                    [type]: {
                        listValue: { values: numberValues }
                    }
                }
            }
        }];
    };

    describe('embed', () => {
        test('Debe generar embedding de texto (Gecko/TextEmbedding)', async () => {
            const mockResp = buildEmbeddingResponse([0.1, 0.2]);
            mockPredict.mockResolvedValue([{ predictions: mockResp }]);

            const result = await VectorCore.embed("Hola");

            expect(result).toEqual([0.1, 0.2]);
            expect(mockPredict).toHaveBeenCalled();
        });

        test('Debe fallar si no hay predicciones', async () => {
            mockPredict.mockResolvedValue([{ predictions: [] }]);
            await expect(VectorCore.embed("T")).rejects.toThrow("No se obtuvo embedding");
        });
    });

    describe('embedImage (Multimodal)', () => {
        test('Debe generar embedding de imagen', async () => {
            const mockResp = buildMultimodalResponse([0.5, 0.6], 'imageEmbedding');
            mockPredict.mockResolvedValue([{ predictions: mockResp }]);

            const buffer = Buffer.from("img");
            const result = await VectorCore.embedImage(buffer);

            expect(result).toEqual([0.5, 0.6]);
        });
    });

    describe('embedText (Multimodal)', () => {
        test('Debe generar embedding de texto multimodal', async () => {
            const mockResp = buildMultimodalResponse([0.8, 0.9], 'textEmbedding');
            mockPredict.mockResolvedValue([{ predictions: mockResp }]);

            const result = await VectorCore.embedText("Hello");
            expect(result).toEqual([0.8, 0.9]);
        });

        test('Debe manejar error en prediccion', async () => {
            mockPredict.mockRejectedValue(new Error("GCP Error"));
            await expect(VectorCore.embedText("H")).rejects.toThrow("GCP Error");
        });
    });
});
