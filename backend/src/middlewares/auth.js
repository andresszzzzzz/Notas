const jwt = require('jsonwebtoken');

// Verifica el token JWT enviado en el header "Authorization: Bearer <token>"
// y adjunta la info del usuario en req.usuario.
const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'No se proporcionó un token de autenticación' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { id, institucionId, nucleoId, tipoPerfil }
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
};

module.exports = { verificarToken };
