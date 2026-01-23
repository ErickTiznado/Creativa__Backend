/**
 * ------------------------------------------------------------------
 * Archivo: RoleMiddleware.js
 * Ubicación: src/middlewares/RoleMiddleware.js
 * Descripción: Middleware de autorización. Verifica si el usuario
 * tiene el rol necesario para acceder a un recurso.
 * ------------------------------------------------------------------
 */

import { supabase } from '../services/SupabaseClient.js';
 
/**
 * Función Generadora (Factory Function).
 * Recibe los roles permitidos y devuelve el middleware real.
 * @param {Array<string>} allowedRoles - Ejemplo: ['admin', 'moderator']
 */

export const requireRole = (allowedRoles) => {

    return async (req, res, next) => {

        if (!req.user || !req.user.userId) {
            res.statusCode = 401;
            return res.json({ error: "No autenticado (RoleMiddleware)" });
        }

        const userId = req.user.userId;

        try {

            const { data: profile, error } = await supabase
            .schema('devschema')
            .from('profile')
            .select('role')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            console.error("Error verficando rol:", error);
            res.statusCode = 500;
            return res.json({ error: "Error al verificar permisos" });
        }

        if (!allowedRoles.includes(profile.role)) {
            res.statusCode = 403;
            return res.json({
                error: "No tienes permisos para realizar esta acción",
                requiredRoles: allowedRoles,
                yourRole: profile.role
            });
        }
        req.userRole = profile.role;
        next();
    } catch (error) {
        console.error("Excepción en RoleMiddleware:", error);
        res.statusCode = 500;
        return res.json({ error: "Error interno del servidor verificando roles" });
    }
  };
};