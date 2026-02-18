import { v4 as uuidv4 } from 'uuid';

class RegisterCampaignUseCase {
    constructor(campaignRepository) {
        this.campaignRepository = campaignRepository;
    }

    async execute(payload) {
        const { user_id, designer_id, data, idCampaing } = payload;

        if (!user_id || !designer_id) {
            throw new Error('user_id y designer_id son obligatorios');
        }

        const newCampaignId = idCampaing || uuidv4();
        const newCampaign = {
            id: newCampaignId,
            user_id,
            designer_id,
            status: 'draft',
            brief_data: data
        };

        const savedCampaign = await this.campaignRepository.save(newCampaign);

        return {
            id: savedCampaign.id,
            data: {
                id: savedCampaign.id,
                status: savedCampaign.status,
                ...savedCampaign.brief_data
            }
        };
    }
}

export default RegisterCampaignUseCase;