/**
 * ------------------------------------------------------------------
 * Archivo: AuthController.js
 * Ubicación: src/controllers/AuthController.js
 * Descripción: Controlador de autenticación. Valida credenciales con Supabase
 * y emite un JWT propio usando Coherer (firmado con `NICOLA_SECRET`).
 * Orquesta la verificación de credenciales y el registro de nuevos usuarios.
 * ------------------------------------------------------------------
 */

import { Coherer } from 'nicola-framework';
import { supabase } from '../services/SupabaseClient.js';

export default class AuthController {

    /**
     * Método: login
     * Ruta asociada: POST /auth/login
     * Descripción: Autentica un usuario existente y devuelve un token de acceso.
     * Flujo de ejecución:
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
     * Ruta asociada: POST /auth/register
     * Descripción: Registra un nuevo usuario en Supabase Auth y guarda su perfil.
     */
    static async register(req, res) {
        const { email, password, firstName, lastName, role } = req.body;

        try {
            // A. Crear usuario en Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password
            });

            if (authError) {
                res.statusCode = 400;
                return res.json({ error: authError.message });
            }

            const userId = authData.user.id;

            // B. Guardar perfil en la tabla 'profile'
            const { error: dbError } = await supabase
                .schema('devschema')
                .from('profile')
                .insert({
                    id: userId,
                    first_name: firstName,
                    last_name: lastName,
                    role: role || 'user'
                });

            if (dbError) {
                console.error("Error guardando perfil", dbError);
                res.statusCode = 500;
                return res.json({ error: "Usuario creado, pero falló al guardar el perfil."});
            }

            // C. Responder éxito
            res.statusCode = 201;
            res.json({
                message: "Usuario registrado correctamente",
                user: {
                    id: userId,
                    email,
                    firstName,
                    lastName,
                    role: role || 'user'
                }
            });

        } catch (err) {
            console.error("Error crítico:", err);
            res.statusCode = 500;
            res.json({ error: "Error interno del servidor" });
        }
    }
}