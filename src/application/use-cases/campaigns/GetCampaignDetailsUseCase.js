class GetCampaignDetailsUseCase {
    constructor(campaignRepository) {
        this.campaignRepository = campaignRepository;
    }

    async execute({ campaignId, designerId }) {
        // 1. Ya no exigimos obligatoriamente el designerId, solo el campaignId
        if (!campaignId) {
            throw new Error('No se proporcionó un id de campaña');
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