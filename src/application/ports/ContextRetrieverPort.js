class ContextRetrieverPort {
  /**
   * Retrieves relevant context for image generation (Brand Manuals, Campaign Vectors, etc.)
   * @param {string} brandId
   * @param {string} campaignId
   * @returns {Promise<Object>} The context object expected by PromptBuilder
   */
  async getContext(brandId, campaignId) {
    throw new Error("Not implemented");
  }
}

export default ContextRetrieverPort;
