class GetCampaignDetailsUseCase {
    constructor(campaignRepository) {
        this.campaignRepository = campaignRepository;
    }

    async execute({ campaignId, designerId }) {
        if (!campaignId || !designerId) {
            throw new Error('No se proporcionó un id de campaña o diseñador');
        }

        const campaignDetails = await this.campaignRepository.findByIdAndDesignerId(campaignId, designerId);

        if (!campaignDetails) {
            return { data: null };
        }

        return {
            data: {
                id: campaignDetails.id,
                brief_data: campaignDetails.brief_data,
                assets: campaignDetails.assets || [],
                status: campaignDetails.status
            }
        };
    }
}

export default GetCampaignDetailsUseCase;