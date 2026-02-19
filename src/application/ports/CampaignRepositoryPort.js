class CampaignRepositoryPort {
    /** 
     * @param {Object} campaignData 
     * @returns {Promise<Object>}
     */
    async save(campaignData) {
        throw new Error('ERR_METHOD_NOT_IMPLEMENTED');
    }

    async updateStatus(campaignId, status) {
        throw new Error('ERR_METHOD_NOT_IMPLEMENTED');
    }

    async findById(campaignId) {
        throw new Error('ERR_METHOD_NOT_IMPLEMENTED');
    }

    async findByDesignerId(designerId) {
        throw new Error('ERR_METHOD_NOT_IMPLEMENTED');
    }
}

export default CampaignRepositoryPort;