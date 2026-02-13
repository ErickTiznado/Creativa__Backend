import { Router } from 'express'; // Importamos Router
// Adaptadores
import { SupabaseAuthAdapter } from '../../persistence/supabase/SupabaseAuthAdapter.js';
import { SupabaseUserRepository } from '../../persistence/supabase/SupabaseUserRepository.js';
// Casos de Uso
import { LoginUseCase } from '../../../application/use-cases/auth/LoginUseCase.js';
import { RegisterUseCase } from '../../../application/use-cases/auth/RegisterUseCase.js';
import { GetProfileUseCase } from '../../../application/use-cases/profile/GetProfileUseCase.js';
import { UpdateProfileUseCase } from '../../../application/use-cases/profile/UpdateProfileUseCase.js';
// Controladores y Middlewares
import { makeAuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

// --- AQUÍ ESTABA EL ERROR: FALTABA INICIALIZAR EL ROUTER ---
const router = Router();
// -----------------------------------------------------------

// Inyección de Dependencias (Manual)
const authAdapter = new SupabaseAuthAdapter();
const userRepo = new SupabaseUserRepository();

const loginUseCase = new LoginUseCase(authAdapter);
const registerUseCase = new RegisterUseCase(authAdapter);
const getProfileUseCase = new GetProfileUseCase(userRepo);
const updateProfileUseCase = new UpdateProfileUseCase(userRepo);

const controller = makeAuthController(loginUseCase, registerUseCase, getProfileUseCase, updateProfileUseCase);

// Rutas Públicas
router.post('/login', controller.login);
router.post('/register', controller.register);

// Rutas Protegidas
router.get('/profile', requireAuth(authAdapter), controller.getProfile);
router.put('/profile', requireAuth(authAdapter), controller.updateProfile);

export default router;