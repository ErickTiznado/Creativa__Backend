import { jest } from '@jest/globals';

// ------------------------------------------------------------------
// 1. MOCKS
// ------------------------------------------------------------------

// GCS
const mockFile = {
    save: jest.fn(),
    copy: jest.fn(),
    delete: jest.fn(),
    download: jest.fn().mockResolvedValue([Buffer.from("img")])
};
const mockBucket = {
    file: jest.fn(() => mockFile)
};
const mockStorage = {
    bucket: jest.fn(() => mockBucket)
};

jest.unstable_mockModule('@google-cloud/storage', () => ({
    Storage: jest.fn(() => mockStorage)
}));

// Sharp
const mockSharpInstance = {
    resize: jest.fn().mockReturnThis(),
    toFormat: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from("thumb")),
    metadata: jest.fn().mockResolvedValue({ format: 'jpeg' })
};
jest.unstable_mockModule('sharp', () => ({
    default: jest.fn(() => mockSharpInstance)
}));

// UUID
jest.unstable_mockModule('uuid', () => ({
    v4: jest.fn(() => 'uuid-123')
}));

// Axios
//jest.unstable_mockModule('axios', () => ({ default: { get: jest.fn() } }));

// Nicola Framework
const mockPatternBuilder = {
    find: jest.fn().mockReturnThis(),
    replace: jest.fn((str) => str.replace('temp', 'approved')) // Simple fake logic
};
jest.unstable_mockModule('nicola-framework', () => ({
    PatternBuilder: jest.fn(() => mockPatternBuilder)
}));

// Vector Core
jest.unstable_mockModule('../services/VectorCore.js', () => ({
    default: {
        embedImage: jest.fn().mockResolvedValue([0.1, 0.2])
    }
}));

// Models
const mockCampaignAsset = {
    create: jest.fn(),
    where: jest.fn().mockReturnThis(),
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
};
const mockCampaignAssetVector = {
    create: jest.fn()
};

jest.unstable_mockModule('../model/CampaignAsset.model.js', () => ({ default: mockCampaignAsset }));
jest.unstable_mockModule('../model/CampaignAssetVector.model.js', () => ({ default: mockCampaignAssetVector }));


// ------------------------------------------------------------------
// 2. IMPORT SERVICE
// ------------------------------------------------------------------
const { default: ImageStorageService } = await import('../services/ImageStorageService.js');

// ------------------------------------------------------------------
// 3. SUITE
// ------------------------------------------------------------------
describe('ImageStorageService (ESM)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset chainable mocks behavior
        mockCampaignAsset.where.mockReturnThis();
        mockCampaignAsset.create.mockResolvedValue({ id: 'new-asset-id' });

        // Reset GCS file
        mockStorage.bucket.mockReturnValue(mockBucket);
        mockBucket.file.mockReturnValue(mockFile);
    });

    describe('processAndSaveImage', () => {
        test('Debe procesar y guardar imagen (draft)', async () => {
            const buffer = Buffer.from("image");
            mockSharpInstance.metadata.mockResolvedValue({ format: 'jpeg' });

            const result = await ImageStorageService.processAndSaveImage({
                buffer,
                campaignId: 'camp1',
                prompt: 'prompt',
                isDraft: true
            });

            expect(mockSharpInstance.resize).toHaveBeenCalledWith(300);
            expect(mockFile.save).toHaveBeenCalledTimes(2); // Original + Thumb
            expect(mockCampaignAsset.create).toHaveBeenCalledWith(expect.objectContaining({
                status: 'draft',
                storage_location: 'temp'
            }));
            expect(result.id).toBe('new-asset-id');
        });
    });

    describe('approvedAsset', () => {
        const assetId = 'asset-1';
        const userId = 'user-1';
        const BUCKET = "creativa-campaign-assets"; // Default in service

        const mockAsset = {
            id: assetId,
            status: 'draft',
            img_url: {
                url: `https://storage.googleapis.com/${BUCKET}/temp/x.png`,
                thumbnail: `https://storage.googleapis.com/${BUCKET}/temp/x_thumb.png`
            },
            prompt_used: 'p'
        };

        beforeEach(() => {
            // process.env changes here won't affect service constant const BUCKET_NAME
        });

        test('Debe aprobar asset, mover en GCS y generar vector', async () => {
            mockCampaignAsset.get.mockResolvedValue([mockAsset]);

            // Mock pattern builder replace -> return relative path
            // Service calls: urlPrefixPattern.replace(url, "")
            // Pattern is: https://storage.googleapis.com/ + BUCKET + /

            mockPatternBuilder.replace.mockImplementation((str) => {
                console.log("MOCK REPLACE CALLED WITH:", str);
                const res = str.replace(`https://storage.googleapis.com/${BUCKET}/`, '');
                console.log("MOCK REPLACE RESULT:", res);
                return res;
            });

            try {
                await ImageStorageService.approvedAsset(assetId, userId);
            } catch (e) {
                console.log("APPROVED ASSET FAILED:", e);
            }

            expect(mockCampaignAsset.where).toHaveBeenCalledWith('id', assetId);
            expect(mockFile.copy).toHaveBeenCalledTimes(2); // Url + Thumb
            expect(mockFile.delete).toHaveBeenCalledTimes(2); // Temp files
            expect(mockCampaignAsset.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'approved',
                approved_by: userId
            }));
            expect(mockCampaignAssetVector.create).toHaveBeenCalled(); // Embedding gen
        });

        test('Debe fallar si asset no es draft', async () => {
            mockCampaignAsset.get.mockResolvedValue([{ ...mockAsset, status: 'approved' }]);
            await expect(ImageStorageService.approvedAsset(assetId, userId))
                .rejects.toThrow("not in draft");
        });
    });

    describe('rejectAsset', () => {
        test('Debe rechazar asset', async () => {
            const assetId = 'a1';
            mockCampaignAsset.get.mockResolvedValue([{ id: assetId, status: 'draft' }]);

            await ImageStorageService.rejectAsset(assetId, 'u1', 'reason');

            expect(mockCampaignAsset.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'rejected',
                rejected_by: 'u1'
            }));
        });
    });

    describe('deleteAssetRecursive', () => {
        test('Debe eliminar asset y sus archivos', async () => {
            const assetId = 'a1';
            const mockAssets = [
                { id: 'a1', img_url: { url: 'https://storage.googleapis.com/creativa-campaign-assets/file.png' } }
            ];

            // Mock finding parent
            mockCampaignAsset.get.mockResolvedValueOnce([mockAssets[0]]) // Parent call
                .mockResolvedValueOnce([]); // Children call

            await ImageStorageService.deleteAssetRecursive(assetId);

            expect(mockFile.delete).toHaveBeenCalled();
            expect(mockCampaignAsset.delete).toHaveBeenCalled();
        });
    });
});
