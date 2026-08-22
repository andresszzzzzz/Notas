const Observador = require('../models/observador');

// Obtener todos los registros del observador
const obtenerObservaciones = async (req, res) => {
  try {
    const observaciones = await Observador.find()
      .populate('institucionId')
      .populate('anioAcademicoId')
      .populate('estudianteId')
      .populate('docenteId')
      .populate('coordinadorId')
      .populate('seguimiento.responsable');

    res.json(observaciones);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Obtener un registro por ID
const obtenerObservacionPorId = async (req, res) => {
  try {
    const observacion = await Observador.findById(req.params.id)
      .populate('institucionId')
      .populate('anioAcademicoId')
      .populate('estudianteId')
      .populate('docenteId')
      .populate('coordinadorId')
      .populate('seguimiento.responsable');

    if (!observacion) {
      return res.status(404).json({ mensaje: 'Registro no encontrado' });
    }

    res.json(observacion);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Crear un registro
const crearObservacion = async (req, res) => {
  try {
    const nuevaObservacion = new Observador(req.body);
    const observacionGuardada = await nuevaObservacion.save();

    res.status(201).json(observacionGuardada);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Actualizar un registro
const actualizarObservacion = async (req, res) => {
  try {
    const observacionActualizada = await Observador.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!observacionActualizada) {
      return res.status(404).json({ mensaje: 'Registro no encontrado' });
    }

    res.json(observacionActualizada);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Eliminar un registro
const eliminarObservacion = async (req, res) => {
  try {
    const observacionEliminada = await Observador.findByIdAndDelete(req.params.id);

    if (!observacionEliminada) {
      return res.status(404).json({ mensaje: 'Registro no encontrado' });
    }

    res.json({ mensaje: 'Registro eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

module.exports = {
  obtenerObservaciones,
  obtenerObservacionPorId,
  crearObservacion,
  actualizarObservacion,
  eliminarObservacion,
};