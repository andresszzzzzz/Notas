const Institucion = require('../models/institucion');

// Aísla cada petición a la institución del usuario autenticado (multi-tenant).
// - Para roles normales: exige institucionId y lo expone en req.institucionId.
// - Para dirNucleo: no tiene institucionId propio; se exponen en
//   req.institucionesNucleo todos los _id de instituciones de su núcleo,
//   para que los controladores de /api/nucleo/* filtren con { $in: [...] }.
const filtrarPorInstitucion = async (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({ mensaje: 'No autenticado' });
  }

  try {
    if (req.usuario.tipoPerfil === 'dirNucleo') {
      const instituciones = await Institucion.find({ nucleoId: req.usuario.nucleoId }).select('_id');
      req.institucionesNucleo = instituciones.map((inst) => inst._id);
      return next();
    }

    if (!req.usuario.institucionId) {
      return res.status(403).json({ mensaje: 'El usuario no tiene una institución asociada' });
    }

    req.institucionId = req.usuario.institucionId;
    next();
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al resolver la institución', error: error.message });
  }
};

module.exports = { filtrarPorInstitucion };
