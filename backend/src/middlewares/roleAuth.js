// Middleware de autorización por rol. Uso: permitirRoles('admin', 'rector')
// Debe usarse siempre después de verificarToken (necesita req.usuario).
const permitirRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ mensaje: 'No autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.tipoPerfil)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para realizar esta acción' });
    }

    next();
  };
};

module.exports = { permitirRoles };
