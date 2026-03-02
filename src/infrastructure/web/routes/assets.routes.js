import {
  getAssets,
  updateAsset,
  deleteAsset,
  getAll,
  checkAssets,
  save,
  updateAssets,
  manualUpload,
  deleteAssets,
} from "../controllers/assets.controller.js";

import { Router } from 'express';
import SearchAssetsUseCase from '../../../application/use-cases/assets/SearchAssetsUseCase.js';
import SupabaseCampaignAssetRepository from '../../persistence/supabase/SupabaseCampaignAssetRepository.js';
import VertexVectorizationService from '../../ai/VertexVectorizationService.js';

const assetsRoutes = Router();

// Dependencias para búsqueda vectorial
const vectorizationService = new VertexVectorizationService();
const assetRepository = new SupabaseCampaignAssetRepository(vectorizationService);
const searchAssetsUseCase = new SearchAssetsUseCase(assetRepository, vectorizationService);

// Búsqueda vectorial semántica
assetsRoutes.get('/search', async (req, res) => {
  try {
    const { query, campaign_id } = req.query;
    if (!query) return res.status(400).json({ success: false, message: 'Se requiere el parámetro query' });
    if (!campaign_id) return res.status(400).json({ success: false, message: 'Se requiere el parámetro campaign_id' });

    const results = await searchAssetsUseCase.execute(query, campaign_id);
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error('[assets/search]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

assetsRoutes.get("/", getAssets);
assetsRoutes.patch("/:id", updateAsset);
assetsRoutes.delete("/:id", deleteAsset);

assetsRoutes.get('/getAll', getAll);
assetsRoutes.get('/check/:campaignId', checkAssets);
assetsRoutes.post('/save', save);
assetsRoutes.post('/updateAssets', updateAssets);
assetsRoutes.delete('/deleteAssets/:assetid', deleteAssets);
assetsRoutes.post('/manualUpload', manualUpload);

export default assetsRoutes;
