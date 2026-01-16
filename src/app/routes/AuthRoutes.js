/**
 * ------------------------------------------------------------------
 * Archivo: AuthRoutes.js
 * Ubicación: src/app/routes/AuthRoutes.js
 * Descripción: Definición de las rutas del módulo de Autenticación.
 * Aquí se mapean las URLs (endpoints) a sus respectivos controladores
 * y se aplican validaciones previas de datos.
 * ------------------------------------------------------------------
 */

import { Remote, Insulator } from "nicola-framework";
import AuthController from "../controllers/AuthController.js";

// 1. Instancia del Enrutador
// Creamos un nuevo enrutador 'Remote' para manejar las peticiones HTTP de este módulo.
const router = new Remote();

/**
 * 2. Esquema de Validación (Insulator)
 * Definimos la estructura estricta que deben tener los datos enviados por el cliente.
 * Si el cliente no envía 'email' o 'password' como strings, Insulator rechazará
 * la petición automáticamente antes de molestar al controlador.
 */
const loginSchema = {
    email: "string",
    password: "string"
};

// Seccion nueva: Agregamos firstName y lastName al validador
const registerSchema = {
    email: "string",
    password: "string",
    firstName: "string",
    lastName: "string",
    role: "string"
};

// 3. Definición de Rutas

/**
 * Endpoint: POST /auth/login
 * Flujo:
 * 1. Recibe la petición.
 * 2. Insulator(loginSchema): Valida tipos de datos.
 * 3. AuthController.login: Ejecuta la lógica de autenticación.
 */
router.post("/login", Insulator(loginSchema), AuthController.login);

// Conectamos al registro
router.post("/register", Insulator(registerSchema), AuthController.register);

/**
 * Endpoint: POST /auth/register
 * Descripción: Ruta reservada para el registro de nuevos usuarios.
 * Actualmente redirige al método 'register' del controlador (pendiente).
 */
router.post("/register", AuthController.register);

// 4. Exportación
// Exportamos el router configurado para que pueda ser montado en app.js.
export default router;