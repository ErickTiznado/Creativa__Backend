import { Router } from 'express';
import SupabaseCampaignRepository from '../../persistence/supabase/SupabaseCampaignRepository.js';
import SupabaseCampaignSuggestionRepository from '../../persistence/supabase/SupabaseCampaignSuggestionRepository.js';
import VertexVectorizationService from '../../ai/VertexVectorizationService.js';
import RegisterCampaignUseCase from '../../../application/use-cases/campaigns/RegisterCampaignUseCase.js';
import UpdateCampaignStatusUseCase from '../../../application/use-cases/campaigns/UpdateCampaignStatusUseCase.js';
import GetCampaignsByDesignerUseCase from '../../../application/use-cases/campaigns/GetCampaignsByDesignerUseCase.js';
import GetCampaignDetailsUseCase from '../../../application/use-cases/campaigns/GetCampaignDetailsUseCase.js';
import GetAllCampaignsUseCase from '../../../application/use-cases/campaigns/GetAllCampaignsUseCase.js';
import SaveCampaignSuggestionUseCase from '../../../application/use-cases/campaigns/SaveCampaignSuggestionUseCase.js';
import GetCampaignSuggestionsUseCase from '../../../application/use-cases/campaigns/GetCampaignSuggestionsUseCase.js';
import CampaignController from '../controllers/campaigns.controller.js';
import SuggestPromptsController from '../controllers/SuggestPromptsController.js';
import GetCampaignSuggestionsController from '../controllers/GetCampaignSuggestionsController.js';
import SupabasePushSubscriptionRepository from '../../persistence/supabase/SupabasePushSubscriptionRepository.js';
import WebPushAdapter from '../../external-services/push/WebPushAdapter.js';
import NotificationService from '../../services/NotificationService.js';
import GeminiTextAdapter from '../../ai/GeminiTextAdapter.js';
import SuggestPromptsUseCase from '../../../application/use-cases/campaigns/SuggestPromptsUseCase.js';

const router = Router();

// Repositories
const campaignRepository           = new SupabaseCampaignRepository();
const suggestionRepository         = new SupabaseCampaignSuggestionRepository();

const vertexVectorizationService   = new VertexVectorizationService();

// Suggestion use cases
const geminiTextAdapter            = new GeminiTextAdapter();
const suggestPromptsUseCase        = new SuggestPromptsUseCase(campaignRepository, geminiTextAdapter);
const saveSuggestionUseCase        = new SaveCampaignSuggestionUseCase(suggestionRepository);
const getCampaignSuggestionsUseCase = new GetCampaignSuggestionsUseCase(suggestionRepository);

// Campaign use cases
const registerCampaignUseCase      = new RegisterCampaignUseCase(campaignRepository, suggestPromptsUseCase);
const updateCampaignStatusUseCase  = new UpdateCampaignStatusUseCase(campaignRepository, vertexVectorizationService);
const getCampaignsByDesignerUseCase = new GetCampaignsByDesignerUseCase(campaignRepository);
const getCampaignDetailsUseCase    = new GetCampaignDetailsUseCase(campaignRepository);
const getAllCampaignsUseCase        = new GetAllCampaignsUseCase(campaignRepository);

// Notifications
const pushSubscriptionRepository   = new SupabasePushSubscriptionRepository();
const pushNotificationAdapter      = new WebPushAdapter();
const notificationService          = new NotificationService(pushSubscriptionRepository, pushNotificationAdapter);

// Controllers
const campaignController           = new CampaignController(
    registerCampaignUseCase,
    updateCampaignStatusUseCase,
    getCampaignsByDesignerUseCase,
    getCampaignDetailsUseCase,
    getAllCampaignsUseCase,
    notificationService
);
const suggestPromptsController     = new SuggestPromptsController(suggestPromptsUseCase, saveSuggestionUseCase);
const getSuggestionsController     = new GetCampaignSuggestionsController(getCampaignSuggestionsUseCase);

// Routes
router.post('/registerCampaigns',  campaignController.register.bind(campaignController));
router.put('/updateStateCampaign', campaignController.updateState.bind(campaignController));
router.get('/designers',           campaignController.getByDesigner.bind(campaignController));
router.get('/campaignById',        campaignController.getById.bind(campaignController));
router.get('/all',                 campaignController.getAll.bind(campaignController));

router.get('/suggest-prompts',     suggestPromptsController.suggest);
router.get('/suggestions',         getSuggestionsController.get);

export default router;
