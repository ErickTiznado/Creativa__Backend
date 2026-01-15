/**
 * ------------------------------------------------------------------
 * Archivo: AuthMiddleware.js
 * Ubicación: src/app/middlewares/AuthMiddleware.js
 * Descripción: Middleware de seguridad. Intercepta las solicitudes HTTP
 * a rutas protegidas para verificar la existencia y validez del Token JWT.
 * Si el token es válido, permite el acceso; si no, responde con error 401.
 * ------------------------------------------------------------------
 */

import { Coherer } from "nicola-framework";

/**
 * Función middleware que se ejecuta antes del controlador.
 * @param {object} req - Objeto de solicitud (Request).
 * @param {object} res - Objeto de respuesta (Response).
 * @param {function} next - Función para pasar el control al siguiente handler.
 */
export const authMiddleware = (req, res, next) => {
    try {
        // 1. Obtención del Header de Autorización
        // Buscamos el encabezado estándar 'Authorization' donde viaja el token.
        const authHeader = req.headers.authorization;

        // Validación: Si no envían el header, denegamos acceso inmediatamente.
        if (!authHeader) {
            throw new Error("No se proporcionó token en el header Authorization");
        }

        // 2. Extracción del Token
        // El formato estándar es "Bearer <token>". Usamos split para separar
        // la palabra "Bearer" del código real.
        // authHeader.split(" ") genera un array: ["Bearer", "eyJhbG..."]
        const token = authHeader.split(" ")[1];

        // Validación: Aseguramos que el token exista después de separar la cadena.
        if (!token) {
            throw new Error("Formato de token inválido (se esperaba 'Bearer <token>')");
        }

        // 3. Verificación de Firma y Expiración
        // Coherer.verify() realiza dos chequeos críticos:
        // a) Que la firma coincida con nuestro NICOLA_SECRET (Autenticidad).
        // b) Que el tiempo actual no supere la fecha de expiración (Validez).
        // Si falla algo, Coherer lanza un error automáticamente.
        const payload = Coherer.verify(token);

        // 4. Inyección de Datos de Usuario
        // Si el token es válido, extraemos la información (payload) y la
        // adjuntamos al objeto 'req'. Así, el controlador podrá saber quién es el usuario.
        req.user = payload;

        // 5. Continuar Ejecución
        // Todo está en orden. Pasamos el control al siguiente middleware o controlador.
        next();

    } catch (error) {
        // 6. Manejo de Acceso Denegado
        // Si ocurre cualquier error (token expirado, falso, o inexistente),
        // respondemos con 401 Unauthorized y detenemos el flujo.
        res.statusCode = 401;
        res.json({
            error: "Acceso denegado",
            message: error.message // Ej: "Token Expired" o "Token Invalid"
        });
    }
};