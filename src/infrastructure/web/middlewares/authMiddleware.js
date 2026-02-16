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

export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user.user_metadata?.role;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        next();
    };
};