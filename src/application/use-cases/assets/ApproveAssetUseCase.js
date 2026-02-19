class ApproveAssetUseCase {
    constructor(storagePort, campaignAssetRepository) {
        this.storagePort = storagePort;
        this.campaignAssetRepository = campaignAssetRepository;
    }

    async execute(assetId) {
        // 1. Fetch asset details from DB
        // We need the method to get asset by ID
        const asset = await this.campaignAssetRepository.findById(assetId);

        if (!asset) {
            throw new Error(`Asset with ID ${assetId} not found.`);
        }

        if (asset.is_approved) {
             throw new Error(`Asset with ID ${assetId} is already approved.`);
        }

        // Extract file paths from URLs or stored metadata
        // Assuming img_url contains the full URL, we need to extract the path (e.g., drafts/brand/campaign/file.png)
        // Or better, store the 'fileName' in the DB to avoid parsing.
        // For now, let's assume we can parse it or it was stored.
        // If we only have the URL: https://storage.googleapis.com/bucket/drafts/...
        // We need to extract 'drafts/...'
        
        const fileUrl = asset.img_url.asset_urls[0]; // Assuming array
        const urlParts = fileUrl.split('/');
        const draftsIndex = urlParts.indexOf('drafts');
        
        if (draftsIndex === -1) {
            throw new Error("Invalid asset URL structure. Cannot find 'drafts' path.");
        }
        
        const mainFilePath = urlParts.slice(draftsIndex).join('/');
        // Infer thumbnail path
        const thumbFilePath = mainFilePath.replace('.png', '_thumb.png'); 

        // 2. Move file in Storage (Draft -> Approved)
        const moveResult = await this.storagePort.approveAsset(mainFilePath, thumbFilePath);

        // 3. Update DB record
        const updatedAsset = await this.campaignAssetRepository.markAsApproved(assetId, {
            newUrl: moveResult.mainApprovedUrl,
            storageLocation: 'approved',
            approvedAt: new Date().toISOString()
        });

        return updatedAsset;
    }
}

export default ApproveAssetUseCase;
