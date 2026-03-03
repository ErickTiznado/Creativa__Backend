import { v4 as uuidv4 } from 'uuid';

class RegisterCampaignUseCase {
    constructor(campaignRepository, suggestPromptsUseCase) {
        this.campaignRepository = campaignRepository;
        this.suggestPromptsUseCase = suggestPromptsUseCase;
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

        // 1. Save campaign FIRST (fast response)
        const savedCampaign = await this.campaignRepository.save(newCampaign);

        // 2. Trigger AI suggestions in background (fire-and-forget)
        if (this.suggestPromptsUseCase) {
            // Use savedCampaign.brief_data to ensure we have the latest state from DB
            this.#generateAndSaveSuggestions(savedCampaign.id, savedCampaign.brief_data)
                .catch(err => console.error("[RegisterCampaign] Background AI generation failed:", err));
        }

        return {
            id: savedCampaign.id,
            data: {
                id: savedCampaign.id,
                status: savedCampaign.status,
                ...savedCampaign.brief_data
            }
        };
    }

    async #generateAndSaveSuggestions(campaignId, briefData) {
        try {
            console.log(`[RegisterCampaign] Starting background AI generation for ${campaignId}...`);
            const suggestions = await this.suggestPromptsUseCase.generateForBrief(briefData);
            
            // Create updated brief object
            const updatedBrief = {
                ...briefData,
                ai_config: suggestions
            };

            // Update in DB
            await this.campaignRepository.updateBrief(campaignId, updatedBrief);
            console.log(`[RegisterCampaign] AI suggestions saved for ${campaignId}`);
        } catch (error) {
            console.error(`[RegisterCampaign] Error in background task: ${error.message}`);
            // We don't throw here to avoid unhandled promise rejections in the main flow if not caught
        }
    }
}

export default RegisterCampaignUseCase;