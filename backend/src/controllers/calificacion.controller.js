const Calificacion = require('../models/Calificacion');

// Obtener todas las calificaciones
const obtenerCalificaciones = async (req, res) => {
  try {
    const calificaciones = await Calificacion.find()
      .populate('institucionId')
      .populate('anioAcademicoId')
      .populate('estudianteId')
      .populate('asignaturaId')
      .populate('grupoId')
      .populate('docenteId')
      .populate('indicadores.indicadorId')
      .populate('actividades.actividadId');

    res.json(calificaciones);
  } catch (error) {
    res.status(500).json({
      mensaje: error.message
    });
  }
};

// Obtener una calificación por ID
const obtenerCalificacionPorId = async (req, res) => {
  try {
    const calificacion = await Calificacion.findById(req.params.id)
      .populate('institucionId')
      .populate('anioAcademicoId')
      .populate('estudianteId')
      .populate('asignaturaId')
      .populate('grupoId')
      .populate('docenteId')
      .populate('indicadores.indicadorId')
      .populate('actividades.actividadId');

    if (!calificacion) {
      return res.status(404).json({
        mensaje: 'Calificación no encontrada'
      });
    }

    res.json(calificacion);
  } catch (error) {
    res.status(500).json({
      mensaje: error.message
    });
  }
};

// Crear calificación
const crearCalificacion = async (req, res) => {
  try {
    const nuevaCalificacion = new Calificacion(req.body);
    const guardada = await nuevaCalificacion.save();

    res.status(201).json(guardada);
  } catch (error) {
    res.status(400).json({
      mensaje: error.message
    });
  }
};

// Actualizar calificación
const actualizarCalificacion = async (req, res) => {
  try {
    const actualizada = await Calificacion.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!actualizada) {
      return res.status(404).json({
        mensaje: 'Calificación no encontrada'
      });
    }

    res.json(actualizada);
  } catch (error) {
    res.status(400).json({
      mensaje: error.message
    });
  }
};

// Eliminar calificación
const eliminarCalificacion = async (req, res) => {
  try {
    const eliminada = await Calificacion.findByIdAndDelete(req.params.id);

    if (!eliminada) {
      return res.status(404).json({
        mensaje: 'Calificación no encontrada'
      });
    }

    res.json({
      mensaje: 'Calificación eliminada correctamente'
    });
  } catch (error) {
    res.status(500).json({
      mensaje: error.message
    });
  }
};

module.exports = {
  obtenerCalificaciones,
  obtenerCalificacionPorId,
  crearCalificacion,
  actualizarCalificacion,
  eliminarCalificacion,
};