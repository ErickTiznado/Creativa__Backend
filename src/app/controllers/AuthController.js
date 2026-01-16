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
     */
    static async login(req, res) {
        const { email, password } = req.body;

        if (!email || !password) {
            res.statusCode = 400;
            return res.json({ error: "Email y password son obligatorios" });
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                res.statusCode = 401; 
                return res.json({ error: "Credenciales inválidas o usuario no encontrado" });
            }

            const payload = { userId: data.user.id, email: data.user.email };
            const token = Coherer.sign(payload, { expiresIn: '1h' });
            
            res.statusCode = 200;
            res.json({
                message: "Login exitoso",
                token: token,
                user: {
                    id: data.user.id,
                    email: data.user.email
                }
            });

        } catch (err) {
            console.error("Error crítico en login:", err);
            res.statusCode = 500;
            res.json({ error: "Error interno del servidor" });
        }
    }

    /**
     * Método: register
     * Ruta asociada: POST /auth/register
     */
    static async register(req, res) {
        // CORRECCIÓN 1: Cerramos correctamente la desestructuración y agregamos 'role'
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
                    first_name: firstName, // Mapeo exacto a tu BD
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
        // CORRECCIÓN 2: Eliminamos la línea vieja que sobraba aquí abajo
    }
}