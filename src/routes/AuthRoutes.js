/**
 * ------------------------------------------------------------------
 * Archivo: AuthRoutes.js
 * Ubicación: src/routes/AuthRoutes.js
 * Descripción: Definición de las rutas del módulo de autenticación.
 * ------------------------------------------------------------------
 */

import { Remote, Insulator } from "nicola-framework";
import AuthController from "../controllers/AuthController.js";
import { requireAuth } from "../middlewares/AuthMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";

// 1. Instancia del Enrutador
const router = new Remote();

/**
 * 2. Esquemas de Validación (Insulator)
 */
const loginSchema = {
    email: "string",
    password: "string"
};

const registerSchema = {
    email: "string",
    password: "string",
    firstName: "string",
    lastName: "string",
    role: "string" // Opcional en controller, pero si se envía debe ser string
};

// 3. Definición de Rutas

// --- RUTAS PÚBLICAS (Sin Token) ---

/**
 * POST /auth/login
 * Inicia sesión y devuelve un token JWT.
 */
router.post("/login", Insulator(loginSchema), AuthController.login);

/**
 * POST /auth/register
 * Crea un nuevo usuario en Supabase y su perfil en la BD.
 */
router.post("/register", Insulator(registerSchema), AuthController.register);

/**
 * POST /auth/forgot-password
 * Envía un correo de recuperación de contraseña.
 */
router.post('/forgot-password', AuthController.forgotPassword);


// --- RUTAS PROTEGIDAS (Requieren Token) ---

/**
 * POST /auth/reset-password
 * Establece una nueva contraseña (requiere estar autenticado o tener token de sesión).
 */
router.post('/reset-password', AuthController.resetPassword);

/**
 * PUT /auth/profile
 * Actualiza la información del perfil del usuario (nombre, apellido).
 */
router.put('/profile', requireAuth, AuthController.updateProfile);


// --- RUTAS ADMINISTRATIVAS (Requieren Rol 'admin') ---

/**
 * POST /auth/users/role
 * Permite a un administrador cambiar el rol de otro usuario.
 * Body esperado: { targetUserId: "uuid", newRole: "user|admin|moderator" }
 */
router.post('/users/role', requireAuth, requireRole(['admin']), AuthController.changeUserRole);


// 4. Exportación
export default router;