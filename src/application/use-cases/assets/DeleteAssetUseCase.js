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

        const fileUrl = asset.img_url.asset_urls[0];
        const urlParts = fileUrl.split('/');
        // Determine if it's in drafts or approved to find the path index
        let pathIndex = urlParts.indexOf('drafts');
        if (pathIndex === -1) {
             pathIndex = urlParts.indexOf('approved');
        }

        if (pathIndex === -1) {
             // If local or unknown structure, we might skip storage deletion or try best effort
             console.warn("No se pudo determinar la ruta de almacenamiento para eliminar el asset.");
        } else {
            const mainFilePath = urlParts.slice(pathIndex).join('/');
            const thumbFilePath = mainFilePath.replace('.png', '_thumb.png');
            
            // Delete from storage
            await this.storagePort.deleteAsset(mainFilePath, thumbFilePath);
        }

        // Delete from DB
        await this.campaignAssetRepository.delete(assetId);

        return { message: "Asset deleted successfully." };
    }
}

export default DeleteAssetUseCase;
