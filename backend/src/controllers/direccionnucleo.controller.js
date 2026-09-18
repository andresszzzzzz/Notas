const DireccionNucleo = require('../models/DireccionNucleo');

// Obtener todas las direcciones de núcleo
const obtenerDirecciones = async (req, res) => {
  try {
    const direcciones = await DireccionNucleo.find()
      .populate('responsableId');

    res.json(direcciones);
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al obtener las direcciones de núcleo',
      error: error.message
    });
  }
};

// Obtener una dirección por ID
const obtenerDireccionPorId = async (req, res) => {
  try {
    const direccion = await DireccionNucleo.findById(req.params.id)
      .populate('responsableId');

    if (!direccion) {
      return res.status(404).json({
        mensaje: 'Dirección de núcleo no encontrada'
      });
    }

    res.json(direccion);
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al buscar la dirección de núcleo',
      error: error.message
    });
  }
};

// Crear una dirección de núcleo
const crearDireccion = async (req, res) => {
  try {
    const nuevaDireccion = new DireccionNucleo(req.body);
    const direccionGuardada = await nuevaDireccion.save();

    res.status(201).json(direccionGuardada);
  } catch (error) {
    res.status(400).json({
      mensaje: 'Error al crear la dirección de núcleo',
      error: error.message
    });
  }
};

// Actualizar una dirección de núcleo
const actualizarDireccion = async (req, res) => {
  try {
    const direccionActualizada = await DireccionNucleo.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!direccionActualizada) {
      return res.status(404).json({
        mensaje: 'Dirección de núcleo no encontrada'
      });
    }

    res.json(direccionActualizada);
  } catch (error) {
    res.status(400).json({
      mensaje: 'Error al actualizar la dirección de núcleo',
      error: error.message
    });
  }
};

// Eliminar una dirección de núcleo
const eliminarDireccion = async (req, res) => {
  try {
    const direccionEliminada = await DireccionNucleo.findByIdAndDelete(req.params.id);

    if (!direccionEliminada) {
      return res.status(404).json({
        mensaje: 'Dirección de núcleo no encontrada'
      });
    }

    res.json({
      mensaje: 'Dirección de núcleo eliminada correctamente'
    });
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al eliminar la dirección de núcleo',
      error: error.message
    });
  }
};

module.exports = {
  obtenerDirecciones,
  obtenerDireccionPorId,
  crearDireccion,
  actualizarDireccion,
  eliminarDireccion,
};