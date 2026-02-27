import { Router } from 'express';
// Adaptadores
import { SupabaseAuthAdapter } from '../../persistence/supabase/SupabaseAuthAdapter.js';
import { SupabaseAdminUserRepository } from '../../persistence/supabase/SupabaseAdminUserRepository.js';
import { SupabaseRecoveryRequestRepository } from '../../persistence/supabase/SupabaseRecoveryRequestRepository.js';
// Casos de Uso - Usuarios
import { ListUsersUseCase } from '../../../application/use-cases/admin/users/ListUsersUseCase.js';
import { CreateUserUseCase } from '../../../application/use-cases/admin/users/CreateUserUseCase.js';
import { UpdateUserUseCase } from '../../../application/use-cases/admin/users/UpdateUserUseCase.js';
import { DeleteUserUseCase } from '../../../application/use-cases/admin/users/DeleteUserUseCase.js';
import { ToggleUserStatusUseCase } from '../../../application/use-cases/admin/users/ToggleUserStatusUseCase.js';
// Casos de Uso - Solicitudes
import { ListRequestsUseCase } from '../../../application/use-cases/admin/requests/ListRequestsUseCase.js';
import { CreateRequestUseCase } from '../../../application/use-cases/admin/requests/CreateRequestUseCase.js';
import { UpdateRequestStatusUseCase } from '../../../application/use-cases/admin/requests/UpdateRequestStatusUseCase.js';
// Controlador y Middlewares
import AdminController from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

// ── Inyección de Dependencias ─────────────────────────────────────────────────
const authAdapter = new SupabaseAuthAdapter();
const adminUserRepo = new SupabaseAdminUserRepository();
const recoveryRequestRepo = new SupabaseRecoveryRequestRepository();

const listUsersUseCase = new ListUsersUseCase(adminUserRepo);
const createUserUseCase = new CreateUserUseCase(adminUserRepo);
const updateUserUseCase = new UpdateUserUseCase(adminUserRepo);
const deleteUserUseCase = new DeleteUserUseCase(adminUserRepo);
const toggleUserStatusUseCase = new ToggleUserStatusUseCase(adminUserRepo);

const listRequestsUseCase = new ListRequestsUseCase(recoveryRequestRepo);
const createRequestUseCase = new CreateRequestUseCase(recoveryRequestRepo);
const updateRequestStatusUseCase = new UpdateRequestStatusUseCase(recoveryRequestRepo);

const adminController = new AdminController(
    listUsersUseCase,
    createUserUseCase,
    updateUserUseCase,
    deleteUserUseCase,
    toggleUserStatusUseCase,
    listRequestsUseCase,
    createRequestUseCase,
    updateRequestStatusUseCase
);

// Guard para rutas de admin
const adminGuard = [requireAuth(authAdapter), requireRole('admin')];

// ── Rutas de Usuarios (protegidas) ────────────────────────────────────────────
router.get('/users', adminGuard, adminController.listUsers);
router.post('/users', adminGuard, adminController.createUser);
router.put('/users/:id', adminGuard, adminController.updateUser);
router.delete('/users/:id', adminGuard, adminController.deleteUser);
router.patch('/users/:id/status', adminGuard, adminController.toggleUserStatus);

// ── Rutas de Solicitudes ──────────────────────────────────────────────────────
router.get('/requests', adminGuard, adminController.listRequests);
router.patch('/requests/:id', adminGuard, adminController.updateRequestStatus);
router.post('/requests', adminController.createRequest); // Pública — formulario de recuperación

export default router;
