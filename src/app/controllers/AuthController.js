/**
 * ------------------------------------------------------------------
 * Archivo: AuthController.js
 * Ubicación: src/app/controllers/AuthController.js
 * Descripción: Controlador encargado de la lógica de negocio para la
 * autenticación. Orquesta la verificación de credenciales con Supabase
 * y la emisión de tokens JWT propios usando el módulo Coherer.
 * ------------------------------------------------------------------
 */

import { Coherer } from 'nicola-framework';
import { supabase } from '../../services/SupabaseClient.js';

export default class AuthController {

    /**
     * Método: login
     * Ruta asociada: POST /auth/login
     * Descripción: Autentica un usuario existente y devuelve un token de acceso.
     * * Flujo de ejecución:
     * 1. Recibe email y password.
     * 2. Consulta a Supabase si las credenciales son válidas.
     * 3. Si es válido, genera un JWT propio firmado por el backend (Nicola).
     */
    static async login(req, res) {
        // 1. Extracción de datos del cuerpo de la solicitud (Request Body)
        const { email, password } = req.body;

        // 2. Validación de Integridad (Sanity Check)
        // Verificamos que los campos no vengan vacíos o nulos antes de procesar.
        if (!email || !password) {
            res.statusCode = 400; // Bad Request
            return res.json({ error: "Email y password son obligatorios" });
        }

        try {
            // 3. Verificación de Identidad con Proveedor Externo (Supabase)
            // Delegamos la comprobación de la contraseña encriptada a Supabase.
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            // Si Supabase devuelve error, el usuario no existe o la contraseña está mal.
            if (error) {
                res.statusCode = 401; // Unauthorized
                return res.json({ error: "Credenciales inválidas o usuario no encontrado" });
            }

            // 4. Generación del Token Propio (JWT - JSON Web Token)
            // Una vez confirmada la identidad, creamos un payload (datos) para el token.
            const payload = { userId: data.user.id, email: data.user.email };

            // Usamos 'Coherer' para firmar el token con nuestra clave secreta (NICOLA_SECRET).
            // Esto asegura que solo nuestro servidor pueda validar este token después.
            const token = Coherer.sign(payload, { expiresIn: '1h' });
            
            // 5. Respuesta Exitosa al Cliente
            res.statusCode = 200;
            res.json({
                message: "Login exitoso",
                token: token, // El frontend debe guardar este token (header Authorization)
                user: {
                    id: data.user.id,
                    email: data.user.email
                }
            });

        } catch (err) {
            // 6. Manejo de Errores Inesperados
            // Captura fallos de red, errores de sintaxis o problemas internos.
            console.error("Error crítico en login:", err);
            res.statusCode = 500; // Internal Server Error
            res.json({ error: "Error interno del servidor" });
        }
    }

    /**
     * Método: register
     * Descripción: Endpoint reservado para futura implementación de registro de usuarios.
     */
    static async register(req, res) {
        res.json({ message: "Endpoint de registro pendiente de implementación" });
    }
}