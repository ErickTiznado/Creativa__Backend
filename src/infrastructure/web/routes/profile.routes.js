import { Router } from 'express';
import SupabaseProfileRepository from '../../persistence/supabase/SupabaseProfileRepository.js';
import GetDesignersUseCase from '../../../application/use-cases/profiles/GetDesignersUseCase.js';
import ProfileController from '../controllers/profile.controller.js';

const router = Router();

const profileRepository = new SupabaseProfileRepository();

const getDesignersUseCase = new GetDesignersUseCase(profileRepository);

const profileController = new ProfileController(getDesignersUseCase);

router.get('/designers', profileController.getDesigners.bind(profileController));

export default router;