class SuggestPromptsController {
    #suggestPromptsUseCase;
    #saveSuggestionUseCase;

    constructor(suggestPromptsUseCase, saveSuggestionUseCase = null) {
        this.#suggestPromptsUseCase = suggestPromptsUseCase;
        this.#saveSuggestionUseCase = saveSuggestionUseCase;
    }

    suggest = async (req, res) => {
        const campaignId  = req.query.campaignId  || req.body.campaignId;
        const style       = req.query.style       || req.body.style;
        const aspectRatio = req.query.aspectRatio || req.body.aspectRatio;
        const imageSize   = req.query.imageSize   || req.body.imageSize;
        const quantity    = req.query.quantity    || req.body.quantity;

        if (!campaignId) {
            return res.status(400).json({ error: 'campaignId is required.' });
        }

        try {
            const options = { style, aspectRatio, imageSize };
            const result  = await this.#suggestPromptsUseCase.execute(campaignId, options);

            // Fire-and-forget: persist only for fresh, real AI generations (not cache, not fallback)
            if (this.#saveSuggestionUseCase && !result.fromCache && !result.isFallback) {
                this.#saveSuggestionUseCase.execute({
                    campaignId,
                    prompts:          result.prompts,
                    recommendedStyle: result.recommendedStyle,
                    reasoning:        result.reasoning,
                    settings: {
                        style:       result.recommendedStyle ?? style,
                        aspectRatio: aspectRatio ?? null,
                        imageSize:   imageSize   ?? null,
                        quantity:    quantity    ?? null,
                    },
                }).catch(err => console.error('[SuggestPrompts] Failed to save suggestion history:', err));
            }

            res.status(200).json(result);
        } catch (error) {
            console.error('[SuggestPromptsController] Error:', error.message);

            if (error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.includes('no brief data')) {
                return res.status(422).json({ error: error.message });
            }

            res.status(500).json({ error: 'Failed to generate prompt suggestions.' });
        }
    };
}

export default SuggestPromptsController;
