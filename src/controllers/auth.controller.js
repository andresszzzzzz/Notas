const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario');
const AnioAcademico = require('../models/anioacademico');

const generarToken = (usuario) => {
  return jwt.sign(
    {
      id: usuario._id,
      institucionId: usuario.institucionId,
      nucleoId: usuario.nucleoId,
      tipoPerfil: usuario.tipoPerfil
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
};

const sinPassword = (usuario) => {
  const obj = usuario.toObject();
  delete obj.credenciales.passwordHash;
  return obj;
};

// Login. Recibe { usuario | email, password, institucionId? }
// institucionId es necesario cuando el mismo usuario (ej. acudiente) puede
// tener perfiles en más de una institución.
const login = async (req, res) => {
  try {
    const { usuario: nombreUsuario, email, password, institucionId } = req.body;

    if (!password || (!nombreUsuario && !email)) {
      return res.status(400).json({ mensaje: 'Usuario/email y contraseña son requeridos' });
    }

    const filtro = email
      ? { email: email.toLowerCase() }
      : { 'credenciales.usuario': nombreUsuario.toLowerCase() };

    if (institucionId) filtro.institucionId = institucionId;

    const usuario = await Usuario.findOne(filtro).select('+credenciales.passwordHash');

    if (!usuario || usuario.estado !== 'activo') {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    const passwordValida = await usuario.compararPassword(password);
    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    usuario.credenciales.ultimoLogin = new Date();
    await usuario.save();

    const token = generarToken(usuario);

    res.status(200).json({
      token,
      usuario: sinPassword(usuario),
      debeCambiarPassword: usuario.credenciales.debeCambiarPassword
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al iniciar sesión', error: error.message });
  }
};

// El logout es solo del lado del cliente (JWT es stateless): basta con que
// el frontend descarte el token. Este endpoint existe para mantener el
// contrato de la API y poder añadir una lista negra de tokens en el futuro.
const logout = (req, res) => {
  res.status(200).json({ mensaje: 'Sesión cerrada correctamente' });
};

// Cambio de contraseña (usuario autenticado cambia su propia contraseña)
const cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordNueva || passwordNueva.length < 6) {
      return res.status(400).json({ mensaje: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const usuario = await Usuario.findById(req.usuario.id).select('+credenciales.passwordHash');

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const passwordValida = await usuario.compararPassword(passwordActual);
    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'La contraseña actual es incorrecta' });
    }

    usuario.credenciales.passwordHash = passwordNueva;
    usuario.credenciales.debeCambiarPassword = false;
    await usuario.save();

    res.status(200).json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al cambiar la contraseña', error: error.message });
  }
};

// Recuperación de contraseña por email. No hay servicio de correo configurado
// todavía (ver PLAN_MIGRACION sección 2.1); por eso, de momento, solo deja
// preparado el flujo y responde 501. Cuando se integre un proveedor de email
// (ej. Nodemailer + SMTP o un servicio como Resend), aquí se debe generar un
// token de un solo uso y enviarlo por correo.
const recuperarPassword = async (req, res) => {
  res.status(501).json({
    mensaje: 'La recuperación de contraseña por correo aún no está disponible. Por ahora, un administrador debe restablecerla desde /api/usuarios/:id/password.'
  });
};

// Devuelve el usuario autenticado (sin password)
const me = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id).populate('institucionId', 'nombre configuracion');

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.status(200).json(sinPassword(usuario));
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el usuario actual', error: error.message });
  }
};

// Cronograma del año académico activo de la institución del usuario
const cronograma = async (req, res) => {
  try {
    if (!req.usuario.institucionId) {
      return res.status(400).json({ mensaje: 'Este usuario no tiene una institución asociada' });
    }

    const anio = await AnioAcademico.findOne({
      institucionId: req.usuario.institucionId,
      estado: { $in: ['activo', 'matricula', 'prematricula'] }
    }).sort({ anio: -1 });

    if (!anio) {
      return res.status(404).json({ mensaje: 'No hay un año académico activo para esta institución' });
    }

    res.status(200).json(anio.cronograma);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el cronograma', error: error.message });
  }
};

module.exports = {
  login,
  logout,
  cambiarPassword,
  recuperarPassword,
  me,
  cronograma
};
