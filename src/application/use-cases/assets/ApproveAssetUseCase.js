class ApproveAssetUseCase {
    constructor(storagePort, campaignAssetRepository) {
        this.storagePort = storagePort;
        this.campaignAssetRepository = campaignAssetRepository;
    }

    async execute(assetId) {
        const asset = await this.campaignAssetRepository.findById(assetId);

        if (!asset) {
            throw new Error(`Asset with ID ${assetId} not found.`);
        }

        if (asset.is_approved) {
            throw new Error(`Asset with ID ${assetId} is already approved.`);
        }

        const mainUrl = asset.img_url?.original;
        const thumbUrl = asset.img_url?.thumbnail;

        if (!mainUrl) {
            throw new Error("Invalid asset: missing original URL.");
        }

        const extractPath = (url) => {
            const urlParts = url.split('/');
            const idx = urlParts.indexOf('drafts');
            if (idx === -1) throw new Error("Invalid asset URL structure. Cannot find 'drafts' path.");
            return urlParts.slice(idx).join('/');
        };

        const mainFilePath = extractPath(mainUrl);
        const thumbFilePath = thumbUrl ? extractPath(thumbUrl) : mainFilePath.replace('.png', '_thumb.png');

        const moveResult = await this.storagePort.approveAsset(mainFilePath, thumbFilePath);

        const updatedAsset = await this.campaignAssetRepository.markAsApproved(assetId, {
            newUrl: moveResult.mainApprovedUrl,
            newThumbnailUrl: moveResult.thumbApprovedUrl,
            storageLocation: 'approved',
            approvedAt: new Date().toISOString()
        });

        return updatedAsset;
    }
}

export default ApproveAssetUseCase;
