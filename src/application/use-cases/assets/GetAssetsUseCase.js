class GetAssetsUseCase {
    constructor(campaignAssetRepository) {
        this.campaignAssetRepository = campaignAssetRepository;
    }

    async execute(campaignId) {
        if (!campaignId) {
            throw new Error("Campaign ID is required to fetch assets.");
        }
        return await this.campaignAssetRepository.findByCampaignId(campaignId);
    }
}

export default GetAssetsUseCase;