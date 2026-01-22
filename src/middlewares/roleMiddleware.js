/**
 * ------------------------------------------------------------------
 * Archivo: RoleMiddleware.js
 * Ubicación: src/middlewares/RoleMiddleware.js
 * Descripción: Middleware de Autorización (RBAC - Role Based Access Control).
 * Intercepta las solicitudes para verificar privilegios antes de permitir
 * el acceso a controladores protegidos.
 * ------------------------------------------------------------------
 */

import { supabase } from '../services/SupabaseClient.js';

/**
 * Función Factoría (Higher-Order Function) para generación de middleware.
 * Configura una instancia de validación basada en una lista blanca de roles permitidos.
 * * @param {Array<string>} allowedRoles - Lista de roles autorizados (ej: ['admin', 'editor'])
 * @returns {Function} Middleware asíncrono listo para ser consumido por el router.
 */
export const requireRole = (allowedRoles) => {

    // Retorna el closure del middleware que tiene acceso al alcance de 'allowedRoles'
    return async (req, res, next) => {

        // 1. Validación de Pre-condiciones
        // Verifica que la solicitud haya pasado exitosamente por el middleware de autenticación previa.
        // Se asume que AuthMiddleware ya inyectó 'req.user'.
        if (!req.user || !req.user.userId) {
            res.statusCode = 401;
            return res.json({ error: "Acceso denegado: Contexto de autenticación no encontrado." });
        }

        const userId = req.user.userId;

        try {
            // 2. Consulta a la Capa de Persistencia
            // Recupera el rol actual del usuario directamente desde la base de datos
            // para asegurar que los permisos estén sincronizados en tiempo real.
            const { data: profile, error } = await supabase
                .schema('devschema')
                .from('profile')
                .select('role')
                .eq('id', userId)
                .single();

            // 3. Manejo de Errores de Infraestructura
            // Detecta fallos en la consulta o inconsistencia de datos (usuario sin perfil).
            if (error || !profile) {
                console.error("Fallo crítico al recuperar rol de usuario:", error);
                res.statusCode = 500;
                return res.json({ error: "Error interno al verificar privilegios de acceso." });
            }

            // 4. Lógica de Autorización (Core)
            // Compara el rol recuperado contra la lista blanca (whitelist) configurada.
            if (!allowedRoles.includes(profile.role)) {
                res.statusCode = 403; // Forbidden
                return res.json({
                    error: "Insuficientes privilegios para ejecutar esta acción.",
                    requiredRoles: allowedRoles,
                    currentRole: profile.role
                });
            }

            // 5. Inyección de Contexto y Continuación
            // El usuario está autorizado. Adjuntamos el rol verificado al request
            // para uso posterior en controladores y pasamos el control.
            req.userRole = profile.role;
            next();

        } catch (error) {
            // Captura de excepciones no controladas en la lógica de autorización
            console.error("Excepción no controlada en RoleMiddleware:", error);
            res.statusCode = 500;
            return res.json({ error: "Error crítico del servidor durante la autorización." });
        }
    };
};