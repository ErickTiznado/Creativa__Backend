class DeleteAssetUseCase {
    constructor(storagePort, campaignAssetRepository) {
        this.storagePort = storagePort;
        this.campaignAssetRepository = campaignAssetRepository;
    }

    async execute(assetId) {
        const asset = await this.campaignAssetRepository.findById(assetId);

        if (!asset) {
            throw new Error(`Asset with ID ${assetId} not found.`);
        }

        const mainUrl = asset.img_url?.original;
        const thumbUrl = asset.img_url?.thumbnail;

        const extractPath = (url) => {
            const urlParts = url.split('/');
            let idx = urlParts.indexOf('drafts');
            if (idx === -1) idx = urlParts.indexOf('approved');
            return idx !== -1 ? urlParts.slice(idx).join('/') : null;
        };

        const mainPath = mainUrl ? extractPath(mainUrl) : null;
        const thumbPath = thumbUrl ? extractPath(thumbUrl) : (mainPath ? mainPath.replace('.png', '_thumb.png') : null);

        if (mainPath && thumbPath) {
            await this.storagePort.deleteAsset(mainPath, thumbPath);
        } else {
            console.warn("Could not determine storage paths for asset deletion.");
        }

        await this.campaignAssetRepository.delete(assetId);

        return { message: "Asset deleted successfully." };
    }
}

export default DeleteAssetUseCase;
