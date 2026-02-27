import { Router } from 'express';
import { SupabaseAuthAdapter } from '../../persistence/supabase/SupabaseAuthAdapter.js';
import SupabasePushSubscriptionRepository from '../../persistence/supabase/SupabasePushSubscriptionRepository.js';
import WebPushAdapter from '../../external-services/push/WebPushAdapter.js';
import NotificationController from '../controllers/NotificationController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

const authAdapter = new SupabaseAuthAdapter();
const pushRepo    = new SupabasePushSubscriptionRepository();
const pushAdapter = new WebPushAdapter();
const controller  = new NotificationController(pushRepo, pushAdapter);

router.get('/vapid-public-key', controller.getVapidPublicKey);
router.post('/subscribe',    requireAuth(authAdapter), controller.subscribe);
router.delete('/unsubscribe', requireAuth(authAdapter), controller.unsubscribe);
router.post('/test',         requireAuth(authAdapter), controller.test);

export default router;
