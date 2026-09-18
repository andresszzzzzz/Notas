const Institucion = require('../models/Institucion');

// Obtener todas las instituciones
const obtenerInstituciones = async (req, res) => {
  try {
    const instituciones = await Institucion.find()
      .populate('nucleoId')
      .populate('rectorId')
      .populate('secretariaId');

    res.json(instituciones);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Obtener una institución por ID
const obtenerInstitucionPorId = async (req, res) => {
  try {
    const institucion = await Institucion.findById(req.params.id)
      .populate('nucleoId')
      .populate('rectorId')
      .populate('secretariaId');

    if (!institucion) {
      return res.status(404).json({ mensaje: 'Institución no encontrada' });
    }

    res.json(institucion);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Crear una institución
const crearInstitucion = async (req, res) => {
  try {
    const nuevaInstitucion = new Institucion(req.body);
    const institucionGuardada = await nuevaInstitucion.save();

    res.status(201).json(institucionGuardada);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Actualizar una institución
const actualizarInstitucion = async (req, res) => {
  try {
    const institucionActualizada = await Institucion.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!institucionActualizada) {
      return res.status(404).json({ mensaje: 'Institución no encontrada' });
    }

    res.json(institucionActualizada);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Eliminar una institución
const eliminarInstitucion = async (req, res) => {
  try {
    const institucionEliminada = await Institucion.findByIdAndDelete(req.params.id);

    if (!institucionEliminada) {
      return res.status(404).json({ mensaje: 'Institución no encontrada' });
    }

    res.json({ mensaje: 'Institución eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Actualizar solo la configuración académica de una institución
// (notaMinima, notaMaxima, numeroPeriodos, niveles, pierdeAnoPor, etc.)
// Hace merge sobre la configuración existente en vez de reemplazarla completa,
// para no perder campos que el frontend no haya enviado en esta petición.
const actualizarConfiguracion = async (req, res) => {
  try {
    const institucion = await Institucion.findById(req.params.id);

    if (!institucion) {
      return res.status(404).json({ mensaje: 'Institución no encontrada' });
    }

    institucion.configuracion = {
      ...institucion.configuracion.toObject(),
      ...req.body
    };

    const institucionActualizada = await institucion.save();

    res.json(institucionActualizada);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al actualizar la configuración', error: error.message });
  }
};

module.exports = {
  obtenerInstituciones,
  obtenerInstitucionPorId,
  crearInstitucion,
  actualizarInstitucion,
  eliminarInstitucion,
  actualizarConfiguracion,
};