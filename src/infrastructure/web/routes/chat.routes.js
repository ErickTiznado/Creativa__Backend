import { Router } from 'express';
import SupabaseChatRepository from '../../persistence/supabase/SupabaseChatRepository.js';
import ChatController from '../controllers/chat.controller.js';

const router = Router();

const chatRepository = new SupabaseChatRepository();
const chatController = new ChatController(chatRepository);

router.get("/chat/campaign/:campaignId", chatController.getChatSessionByCampaignId);
router.get("/chat/campaign", chatController.getChatSessionByCampaignId);
router.post("/chat", chatController.handleChat);


router.get("/chat/:id", chatController.getChatSessionById);
router.put("/chat/:id", chatController.updateChatSession);

export default router;