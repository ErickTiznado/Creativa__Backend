class UpdateCampaignStatusUseCase {

    constructor(campaignRepository, vectorizationService) {
        this.campaignRepository = campaignRepository;
        this.vectorizationService = vectorizationService;
    }

    async execute({ campaignId, status }) {
        if (!campaignId || !status) {
            throw new Error('No se proporciono un id de campaña o estado');
        }

        await this.campaignRepository.updateStatus(campaignId, status);

        const currentCampaign = await this.campaignRepository.findById(campaignId);

        if (currentCampaign && currentCampaign.brief_data && this.vectorizationService) {
            this.vectorizationService.vectorizeCampaign(campaignId, currentCampaign.brief_data)
                .catch((err) => {
                    console.error("[Background] Error vectorizando campaña:", err);
                });
        }

        return {
            success: true,
            message: "Estado actualizado"
        };
    }
}

export default UpdateCampaignStatusUseCase;