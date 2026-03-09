export const requireAuth = (authAdapter) => {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer')) {
                return res.status(401).json({ error: 'Token no proporcionado' });
            }

            const token = authHeader.split(' ')[1].trim();
            const user = await authAdapter.verifyToken(token);

            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json({ error: 'Acceso no autorizado' });
        }
    };
};

export const requireRole = (userRepository, ...allowedRoles) => {
    return async (req, res, next) => {
        try {
            const profile = await userRepository.findById(req.user.id);

            const userRole = (profile?.role || '').toLowerCase().trim();

            const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase().trim());

            if (!normalizedAllowedRoles.includes(userRole)) {
                console.warn(`[Middleware] Bloqueo: El rol '${userRole}' no está en la lista permitida [${normalizedAllowedRoles}]`);
                return res.status(403).json({ error: 'Acceso Denegado' });
            }

            next();
        } catch (error) {
            console.error("[Middleware] Error en validación de rol:", error);
            return res.status(403).json({ error: 'Acceso denegado' });
        }
    };
};