class GetAllCampaignsUseCase {
    constructor(campaignRepository) {
        this.campaignRepository = campaignRepository;
    }

    async execute() {
        const campaigns = await this.campaignRepository.findAll();
        return {
            success: true,
            message: "Campañas obtenidas con éxito",
            data: campaigns
        };
    }
}

export default GetAllCampaignsUseCase;