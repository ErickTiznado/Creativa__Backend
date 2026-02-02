import { jest } from '@jest/globals';

// 1. MOCKS
const mockEditImageWithMask = jest.fn();
jest.unstable_mockModule('../services/GeminiService.js', () => ({
    default: {
        editImageWithMask: mockEditImageWithMask
    }
}));

const mockGetAssetById = jest.fn();
const mockFetchAssetsAsGeminiParts = jest.fn();
const mockProcessAndSaveImage = jest.fn();

jest.unstable_mockModule('../services/ImageStorageService.js', () => ({
    default: {
        getAssetById: mockGetAssetById,
        fetchAssetsAsGeminiParts: mockFetchAssetsAsGeminiParts,
        processAndSaveImage: mockProcessAndSaveImage
    }
}));

const mockReaddir = jest.fn().mockResolvedValue([]);
const mockReadFile = jest.fn().mockResolvedValue(Buffer.from("ref"));
const mockAccess = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('fs/promises', () => ({
    default: {
        readdir: mockReaddir,
        readFile: mockReadFile,
        access: mockAccess
    }
}));

// 2. IMPORT SERVICE
const { default: InpaintingService } = await import('../services/InpaintingService.js');

// 3. SUITE
describe('InpaintingService (ESM)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('processInpainting', () => {
        const params = {
            assetId: 'a1',
            prompt: 'Make it pop',
            maskImage: 'data:image/png;base64,mask',
            brandId: 'b1',
            referenceImages: []
        };

        test('Debe procesar inpainting exitosamente', async () => {
            // Mock dependencies
            // 0. Load references (empty default)

            // 1. Get Source Asset
            mockGetAssetById.mockResolvedValue({ id: 'a1', campaign_assets: 'c1' });

            // 2. Download source image
            mockFetchAssetsAsGeminiParts.mockResolvedValue({
                parts: [{ inlineData: { data: 'source-base64' } }]
            });

            // 3. Call Gemini
            mockEditImageWithMask.mockResolvedValue({
                buffer: Buffer.from("result"),
                text: "Success"
            });

            // 4. Save
            mockProcessAndSaveImage.mockResolvedValue({ id: 'new-a2' });

            const result = await InpaintingService.processInpainting(params);

            expect(mockGetAssetById).toHaveBeenCalledWith('a1');
            expect(mockFetchAssetsAsGeminiParts).toHaveBeenCalledWith(['a1']);
            expect(mockEditImageWithMask).toHaveBeenCalledWith(
                'Make it pop',
                'source-base64', // Source
                'mask', // Clean mask
                expect.any(Array) // refs
            );
            expect(mockProcessAndSaveImage).toHaveBeenCalled();
            expect(result.id).toBe('new-a2');
            expect(result.text_comment).toBe("Success");
        });

        test('Debe fallar si no encuentra asset', async () => {
            mockGetAssetById.mockResolvedValue(null);
            await expect(InpaintingService.processInpainting(params))
                .rejects.toThrow("Asset not found");
        });

        test('Debe fallar si Gemini falla', async () => {
            mockGetAssetById.mockResolvedValue({ id: 'a1' });
            mockFetchAssetsAsGeminiParts.mockResolvedValue({ parts: [{ inlineData: { data: 'd' } }] });
            mockEditImageWithMask.mockResolvedValue(null); // Fail

            await expect(InpaintingService.processInpainting(params))
                .rejects.toThrow("Failed to generate");
        });
    });

    describe('_loadLocalReferences', () => {
        test('Debe cargar referencias locales', async () => {
            // We can't easily test private method directly but we can verify it was called via side effects or exposed behavior?
            // Actually javascript classes private methods are accessible if not #private.
            // _loadLocalReferences is just a method.

            mockReaddir.mockResolvedValue(['ref1.png', 'ignore.txt']);
            const refs = await InpaintingService._loadLocalReferences();

            expect(refs).toHaveLength(1);
            expect(mockReadFile).toHaveBeenCalled();
        });
    });
});
