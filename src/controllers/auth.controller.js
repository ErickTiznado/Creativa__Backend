/**
 * ------------------------------------------------------------------
 * Archivo: AuthController.js
 * Ubicación: src/controllers/AuthController.js
 * Descripción: Controlador de autenticación. Valida credenciales con Supabase
 * y emite un JWT propio usando Coherer (firmado con `NICOLA_SECRET`).
 * ------------------------------------------------------------------
 */

import { Coherer, PatternBuilder } from 'nicola-framework';
import { supabase } from '../services/SupabaseClient.js';

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
            // Firma del token propio
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

    /**
     * TAREA 1.1: Recuperación de Contraseña
     * Ruta asociada: POST /auth/forgot-password
     */
    static async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            // Validación básica
            if (!email || email.trim() === '' ) {
                res.statusCode = 400;
                return res.json({ error: "Email es obligatorio"});
            }
        
            // Validación PatternBuilder
            const emailPattern = new PatternBuilder()
                .startOfLine() // Corregido: startOfLine (con L mayúscula)
                .word().oneOrMore()
                .find('@')
                .word().oneOrMore()
                .find('.')
                .word().oneOrMore()
                .endOfLine();

            if (!emailPattern.matches(email)) {
                res.statusCode = 400;
                return res.json({ error: "Formato de email inválido"});
            }

            // Obtener URL del frontend (Corregido typos FROTEND -> FRONTEND)
            const frontendUrl = process.env.FRONTEND_URL;

            if (!frontendUrl) {
                // Corregido: Faltaba paréntesis de cierre
                console.error("ERROR CRÍTICO: FRONTEND_URL no está definida en .env");
                res.statusCode = 500;
                return res.json({ error: "Error de configuración del servidor"});    
            }

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${frontendUrl}/reset-password`,
            });

            if (error) {
                console.error("Supabase Error (forgotPassword):", error.message);
                res.statusCode = 500;
                return res.json({ error: "Error al procesar solicitud" });
            }

            res.statusCode = 200;
            return res.json({
                message: "Si el email existe, recibirás instrucciones para recuperar tu contraseña"
            });

        } catch (error) {
            console.error("Excepción en forgotPassword:", error);
            res.statusCode = 500;
            return res.json({ error: "Error interno del servidor" });
        }
    }

    /**
     * TAREA 1.2: Restablecer Contraseña
     * Ruta asociada: POST /auth/reset-password
     */
    // --- RESET PASSWORD (LOGICA CORREGIDA PARA TOKEN SUPABASE) ---
    static async resetPassword(req, res) {
        try {
            const { newPassword } = req.body;
            
            // 1. Extraer el token manualmente (ya que quitamos el middleware)
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                res.statusCode = 401;
                return res.json({ error: "Token de recuperación no proporcionado" });
            }
            const token = authHeader.split(" ")[1];

            // 2. Validar contraseña (Tu lógica de seguridad)
            if (!newPassword || newPassword.length < 8) {
                res.statusCode = 400;
                return res.json({ error: "La contraseña debe tener al menos 8 caracteres"});
            }
            const upperCasePattern = new PatternBuilder().range('A', 'Z');
            const digitPattern = new PatternBuilder().digit();
            if (!upperCasePattern.matches(newPassword) || !digitPattern.matches(newPassword)) {
                res.statusCode = 400;
                return res.json({ error: "La contraseña debe contener al menos una mayúscula y un número" });
            }

            // 3. Intercambiar Token de Supabase
            // Esto valida que el token del correo sea real y no haya expirado.
            const { data, error: sessionError } = await supabase.auth.getUser(token);

            if (sessionError || !data.user) {
                res.statusCode = 401;
                return res.json({ error: "El enlace de recuperación es inválido o ha expirado" });
            }

            // 4. Actualizar la contraseña
            // Usamos el ID del usuario que obtuvimos del token válido
            const { error: updateError } = await supabase.auth.admin.updateUserById(
                data.user.id,
                { password: newPassword }
            );
            
            // NOTA: Si te sale error de "admin undefined", avísame para darte el plan B.
            // Pero esto es lo más limpio para backends.

            if (updateError) {
                console.error("Supabase Update Error:", updateError);
                res.statusCode = 500;
                return res.json({ error: "No se pudo actualizar la contraseña" });
            }

            res.statusCode = 200;
            return res.json({ message: "Contraseña actualizada correctamente" });

        } catch (error) {
            console.error("Excepción en resetPassword:", error);
            res.statusCode = 500;
            return res.json({ error: "Error interno del servidor" });
        }
    }
    /**
     * TAREA 2.2: Actualización de Perfil (CORREGIDO)
     * Ruta asociada: PUT /auth/profile
     */
    static async updateProfile(req, res) {
        try {
            // 1. Obtener ID del usuario autenticado
            const { userId } = req.user; 

            // 2. Extraer datos del body
            const { firstName, lastName } = req.body;

            // DEBUG: Ver en consola qué llega realmente
            console.log("--> Update Profile Request:", { firstName, lastName });

            // 3. Construir objeto de actualización
            const updateData = {};
            
            // Validación First Name
            if (firstName && firstName.trim().length > 0) {
                updateData.first_name = firstName.trim();
            }

            // Validación Last Name (Aseguramos que usamos la variable lastName)
            if (lastName && lastName.trim().length > 0) {
                updateData.last_name = lastName.trim();
            }

            // 4. Validar que hay datos para actualizar
            if (Object.keys(updateData).length === 0) {
                res.statusCode = 400;
                return res.json({ error: "No hay datos para actualizar" });
            }

            // 5. Actualizar en base de datos
            const { error: updateError } = await supabase
                .schema('devschema')
                .from('profile')
                .update(updateData)
                .eq('id', userId);

            if (updateError) {
                console.error("Supabase Update Error:", updateError);
                res.statusCode = 500;
                return res.json({ error: "Error al actualizar perfil" });
            }

            // 6. Obtener perfil actualizado
            const { data: updatedProfile, error: fetchError } = await supabase
                .schema('devschema')
                .from('profile')
                .select('*')
                .eq('id', userId)
                .single();

            if (fetchError) {
                console.error("Supabase Fetch Error:", fetchError);
                res.statusCode = 500;
                return res.json({ error: "Error al obtener perfil actualizado" });
            }

            // 7. Respuesta exitosa
            res.statusCode = 200;
            return res.json({
                message: "Perfil actualizado correctamente",
                user: updatedProfile
            });

        } catch (error) {
            console.error("Excepción en updateProfile:", error);
            res.statusCode = 500;
            return res.json({ error: "Error interno del servidor" });
        }
    }

    /**
     * TAREA 3.4: Gestión de Roles (FINAL Y LIMPIO)
     */
    static async changeUserRole(req, res) {
        try {
            const { targetUserId, newRole } = req.body;
            const requesterId = req.user.userId;

            // 1. AUTO-PROTECCIÓN
            if (targetUserId.trim() === requesterId.trim()) {
                res.statusCode = 400; 
                return res.json({ 
                    error: "No puedes cambiar tu propio rol. Solicita a otro administrador que lo haga." 
                });
            }

            // 2. Validar Rol
            const validRoles = ['user', 'admin'];
            if (!validRoles.includes(newRole)) {
                res.statusCode = 400;
                return res.json({ error: "Rol no válido. Roles permitidos: " + validRoles.join(", ") });
            }

            // 3. Actualizar en Supabase Auth
            const { error: authError } = await supabase.auth.admin.updateUserById(
                targetUserId,
                { app_metadata: { role: newRole } }
            );

            if (authError) {
                console.error("Error Supabase Auth:", authError);
                res.statusCode = 500;
                return res.json({ error: "No se pudo actualizar el rol en autenticación" });
            }

            // 4. Actualizar en Base de Datos (devschema)
            const { error: dbError } = await supabase
                .schema('devschema')
                .from('profile')
                .update({ role: newRole })
                .eq('id', targetUserId);

            if (dbError) {
                console.error("Error BD Profile:", dbError);
                res.statusCode = 500;
                return res.json({ error: "Rol actualizado en Auth pero falló en Perfil" });
            }

            res.statusCode = 200;
            return res.json({ 
                message: "Rol actualizado correctamente",
                targetUserId: targetUserId,
                newRole: newRole
            });

        } catch (error) {
            console.error("Excepción en changeUserRole:", error);
            res.statusCode = 500;
            return res.json({ error: "Error interno del servidor" });
        }
    }
}