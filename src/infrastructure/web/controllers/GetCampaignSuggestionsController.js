class GetCampaignSuggestionsController {
    #getCampaignSuggestionsUseCase;

    constructor(getCampaignSuggestionsUseCase) {
        this.#getCampaignSuggestionsUseCase = getCampaignSuggestionsUseCase;
    }

    get = async (req, res) => {
        const campaignId = req.query.campaignId || req.body.campaignId;

        if (!campaignId) {
            return res.status(400).json({ error: 'campaignId es obligatorio.' });
        }

        try {
            const suggestions = await this.#getCampaignSuggestionsUseCase.execute(campaignId);
            res.status(200).json({ suggestions });
        } catch (error) {
            console.error('[GetCampaignSuggestionsController] Error:', error.message);
            res.status(500).json({ error: 'No se pudo obtener el historial de sugerencias.' });
        }
    };
}

export default GetCampaignSuggestionsController;
