class SearchAssetsUseCase {
  constructor(campaignAssetRepository, vectorizationService) {
    this.campaignAssetRepository = campaignAssetRepository;
    this.vectorizationService = vectorizationService;
  }

  async execute(query, campaignId) {
    if (!query?.trim()) throw new Error('Se requiere una consulta de búsqueda');
    if (!campaignId) throw new Error('Se requiere el ID de la campaña');

    const embedding = await this.vectorizationService.generateQueryEmbedding(query);
    return await this.campaignAssetRepository.searchByVector(embedding, campaignId);
  }
}

export default SearchAssetsUseCase;
