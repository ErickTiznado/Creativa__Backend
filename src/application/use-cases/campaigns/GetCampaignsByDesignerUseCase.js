class GetCampaignsByDesignerUseCase {
    constructor(campaignRepository) {
        this.campaignRepository = campaignRepository;
    }

    async execute(designerId) {
        if (!designerId) {
            throw new Error('No se proporcionó un ID de diseñador');
        }

        const campaigns = await this.campaignRepository.findByDesignerId(designerId);

        return {
            data: campaigns
        };
    }
}

export default GetCampaignsByDesignerUseCase;