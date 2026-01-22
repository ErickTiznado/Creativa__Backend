/**
 * ------------------------------------------------------------------
 * Archivo: AuthMiddleware.js
 * Ubicación: src/middlewares/AuthMiddleware.js
 * Descripción: Middleware de seguridad. Intercepta solicitudes HTTP
 * a rutas protegidas para verificar la existencia y validez del token JWT.
 * Si el token es válido, permite el acceso; si no, responde con error 401.
 * ------------------------------------------------------------------
 */

import { Coherer } from "nicola-framework";

/**
 * Función middleware que se ejecuta antes del controlador.
 * Nombre actualizado: requireAuth (según Tarea 2)
 * @param {object} req - Objeto de solicitud (Request).
 * @param {object} res - Objeto de respuesta (Response).
 * @param {function} next - Función para pasar el control al siguiente handler.
 */
export const requireAuth = (req, res, next) => {
    try {
        // 1. Obtención del Header de Autorización
        // Buscamos el encabezado estándar 'Authorization' donde viaja el token.
        const authHeader = req.headers.authorization;

        // Validación: Si no envían el header O no empieza con "Bearer "
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            // Nota: Es mejor responder directamente aquí para evitar confusiones
            res.statusCode = 401;
            return res.json({ error: "Token no proporcionado" });
        }

        // 2. Extracción del Token
        // El formato estándar es "Bearer <token>". Usamos split para separar
        // la palabra "Bearer" del código real.
        // authHeader.split(" ") genera un array: ["Bearer", "eyJhbG..."]
        const token = authHeader.split(" ")[1];

        // Validación extra: Aseguramos que el token exista después de separar
        if (!token) {
            res.statusCode = 401;
            return res.json({ error: "Formato de token inválido" });
        }

        // 3. Verificación de Firma y Expiración
        // Coherer.verify() realiza dos chequeos críticos:
        // a) Que la firma coincida con nuestro NICOLA_SECRET (Autenticidad).
        // b) Que el tiempo actual no supere la fecha de expiración (Validez).
        const payload = Coherer.verify(token);

        // 4. Inyección de Datos de Usuario
        // Si el token es válido, extraemos la información (payload) y la
        // adjuntamos al objeto 'req'. Así, el controlador podrá saber quién es el usuario.
        req.user = payload;

        // 5. Continuar Ejecución
        // Todo está en orden. Pasamos el control al siguiente middleware o controlador.
        next();

    } catch (error) {
        // 6. Manejo de Acceso Denegado (Token inválido o expirado)
        res.statusCode = 401;
        res.json({
            error: "Token inválido o expirado",
            details: error.message // Útil para debugging, puedes quitarlo en producción
        });
    }
};