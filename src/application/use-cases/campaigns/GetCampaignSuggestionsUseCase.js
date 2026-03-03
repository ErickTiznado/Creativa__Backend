class GetCampaignSuggestionsUseCase {
    #suggestionRepository;

    constructor(suggestionRepository) {
        this.#suggestionRepository = suggestionRepository;
    }

    async execute(campaignId) {
        if (!campaignId) {
            throw new Error('campaignId es obligatorio');
        }
        return this.#suggestionRepository.findByCampaignId(campaignId);
    }
}

export default GetCampaignSuggestionsUseCase;
