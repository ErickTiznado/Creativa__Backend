class CampaignSuggestionRepositoryPort {
    /**
     * @param {{ campaign_id: string, prompts: string[], recommended_style: string, reasoning: string, settings: object }} suggestion
     * @returns {Promise<object>}
     */
    async save(suggestion) {
        throw new Error('ERR_METHOD_NOT_IMPLEMENTED');
    }

    /**
     * @param {string} campaignId
     * @returns {Promise<object[]>}
     */
    async findByCampaignId(campaignId) {
        throw new Error('ERR_METHOD_NOT_IMPLEMENTED');
    }
}

export default CampaignSuggestionRepositoryPort;
