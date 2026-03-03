class SaveCampaignSuggestionUseCase {
    #suggestionRepository;

    constructor(suggestionRepository) {
        this.#suggestionRepository = suggestionRepository;
    }

    async execute({ campaignId, prompts, recommendedStyle, reasoning, settings = {} }) {
        if (!campaignId || !prompts?.length) {
            throw new Error('campaignId y prompts son obligatorios');
        }

        return this.#suggestionRepository.save({
            campaign_id:       campaignId,
            prompts,
            recommended_style: recommendedStyle ?? null,
            reasoning:         reasoning ?? null,
            settings,
        });
    }
}

export default SaveCampaignSuggestionUseCase;
