import { jest } from '@jest/globals';

// 1. MOCKS
const mockAxiosGet = jest.fn();
jest.unstable_mockModule('axios', () => ({
    default: { get: mockAxiosGet }
}));

const mockEmbed = jest.fn();
// Mock as class with static method
class MockVectorCore {
    static async embed(text) {
        return mockEmbed(text);
    }
}

jest.unstable_mockModule('../services/VectorCore.js', () => ({
    default: MockVectorCore
}));

// 2. IMPORT SERVICE
const { default: RagService } = await import('../services/RagService.js');

// 3. SUITE
describe('RagService (ESM)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getContext', () => {
        const brandId = 'b1';
        const brief = 'Test brief';

        test('Debe recuperar contexto vía API y calcular similitud', async () => {
            // Mock API returning vectors
            // Vector A: [1, 0] (Perfect match for [1, 0])
            // Vector B: [0, 1] (Orthogonal, score 0)
            const manualVectors = [
                { content: 'Guide 1', content_text: 'Guide 1', embedding: JSON.stringify([1, 0]) },
                { content: 'Guide 2', content_text: 'Guide 2', embedding: JSON.stringify([0, 1]) }
            ];
            mockAxiosGet.mockImplementation(() => Promise.resolve({ data: manualVectors }));

            // Mock Brief Embedding
            mockEmbed.mockImplementation(() => Promise.resolve([1, 0]));

            const result = await RagService.getContext(brandId, brief, 'req1');
            console.log("SUCCESS RESULT:", JSON.stringify(result));

            expect(mockAxiosGet).toHaveBeenCalled();
            expect(mockEmbed).toHaveBeenCalledWith(brief);
            expect(result.source).toBe('rag_api');
            expect(result.relevanceScore).toBeCloseTo(1.0);
            expect(result.data.guidelines).toContain('Guide 1');
            expect(result.data.guidelines).toHaveLength(2);
        });

        test('Debe usar fallback si API falla', async () => {
            mockAxiosGet.mockRejectedValue(new Error("API Down"));

            const result = await RagService.getContext(brandId, brief, 'req1');

            expect(result.source).toBe('fallback');
            expect(result.data.colors).toBeDefined();
        });

        test('Debe usar fallback si API retorna vacío', async () => {
            mockAxiosGet.mockResolvedValue({ data: [] });

            const result = await RagService.getContext(brandId, brief, 'req1');

            expect(result.source).toBe('fallback');
        });

        test('Debe filtrar items con embeddings inválidos', async () => {
            const vectors = [
                { content: 'Bad', embedding: "invalid-json" }, // Should be skipped
                { content: 'Good', embedding: JSON.stringify([1, 1]) }
            ];
            mockAxiosGet.mockResolvedValue({ data: vectors });
            mockEmbed.mockResolvedValue([1, 1]); // Perfect match

            const result = await RagService.getContext(brandId, brief, 'req1');

            // Only 'Good' remains
            expect(result.data.guidelines).toHaveLength(1);
            expect(result.data.guidelines[0]).toBe('Good');
        });
    });
});
