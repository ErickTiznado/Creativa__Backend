class CampaignAssetRepositoryPort {
  async save(assetData) {
    throw new Error("Not implemented");
  }

  async searchByVector(queryEmbedding, campaignId, limit) {
    throw new Error("Not implemented");
  }
}

export default CampaignAssetRepositoryPort;
