const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({
                error: 'Acceso denegado: Se requieren permisos superiores.'
            });
        }
        next();
    };
};

const requireAdmin = requireRole('admin');

module.exports = { requireRole, requireAdmin };
