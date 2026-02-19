import { Router } from 'express';
import SupabaseCampaignRepository from '../../persistence/supabase/SupabaseCampaignRepository.js';
import VertexVectorizationService from '../../ai/VertexVectorizationService.js';
import RegisterCampaignUseCase from '../../../application/use-cases/campaigns/RegisterCampaignUseCase.js';
import UpdateCampaignStatusUseCase from '../../../application/use-cases/campaigns/UpdateCampaignStatusUseCase.js';
import GetCampaignsByDesignerUseCase from '../../../application/use-cases/campaigns/GetCampaignsByDesignerUseCase.js';
import GetCampaignDetailsUseCase from '../../../application/use-cases/campaigns/GetCampaignDetailsUseCase.js';
import GetAllCampaignsUseCase from '../../../application/use-cases/campaigns/GetAllCampaignsUseCase.js';
import CampaignController from '../controllers/campaigns.controller.js';

const router = Router();

// 1. Instanciamos el repositorio
const campaignRepository = new SupabaseCampaignRepository();

const vertexVectorizationService = new VertexVectorizationService();


// ----------------------

// 2. Instanciamos el caso de uso
const registerCampaignUseCase = new RegisterCampaignUseCase(campaignRepository);

const updateCampaignStatusUseCase = new UpdateCampaignStatusUseCase(campaignRepository, vertexVectorizationService);

const getCampaignsByDesignerUseCase = new GetCampaignsByDesignerUseCase(campaignRepository);

const getCampaignDetailsUseCase = new GetCampaignDetailsUseCase(campaignRepository);

const getAllCampaignsUseCase = new GetAllCampaignsUseCase(campaignRepository);

// 3. Instanciamos el controlador 
const campaignController = new CampaignController(registerCampaignUseCase, updateCampaignStatusUseCase, getCampaignsByDesignerUseCase, getCampaignDetailsUseCase, getAllCampaignsUseCase);

// 4. Definimos la ruta
router.post('/registerCampaigns', campaignController.register.bind(campaignController));

router.put('/updateStateCampaign', campaignController.updateState.bind(campaignController));

router.get('/designers', campaignController.getByDesigner.bind(campaignController));

router.get('/campaignById', campaignController.getById.bind(campaignController));

router.get('/all', campaignController.getAll.bind(campaignController));

export default router;