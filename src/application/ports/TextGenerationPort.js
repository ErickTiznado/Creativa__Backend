class TextGenerationPort {
    /**
     * Generate text from a system prompt and user prompt.
     * @param {string} systemPrompt - Instructions for the AI
     * @param {string} userPrompt - The user's input/context
     * @returns {Promise<string>} Generated text response
     */
    async generateText(systemPrompt, userPrompt) {
        throw new Error("Method 'generateText' must be implemented.");
    }
}

export default TextGenerationPort;
