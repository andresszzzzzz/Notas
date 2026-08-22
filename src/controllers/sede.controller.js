const Sede = require('../models/sede');

// Obtener todas las sedes
const obtenerSedes = async (req, res) => {
  try {
    const sedes = await Sede.find().populate('institucionId');
    res.json(sedes);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Obtener una sede por ID
const obtenerSedePorId = async (req, res) => {
  try {
    const sede = await Sede.findById(req.params.id).populate('institucionId');

    if (!sede) {
      return res.status(404).json({ mensaje: 'Sede no encontrada' });
    }

    res.json(sede);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Crear una sede
const crearSede = async (req, res) => {
  try {
    const nuevaSede = new Sede(req.body);
    const sedeGuardada = await nuevaSede.save();

    res.status(201).json(sedeGuardada);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Actualizar una sede
const actualizarSede = async (req, res) => {
  try {
    const sedeActualizada = await Sede.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!sedeActualizada) {
      return res.status(404).json({ mensaje: 'Sede no encontrada' });
    }

    res.json(sedeActualizada);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Eliminar una sede
const eliminarSede = async (req, res) => {
  try {
    const sedeEliminada = await Sede.findByIdAndDelete(req.params.id);

    if (!sedeEliminada) {
      return res.status(404).json({ mensaje: 'Sede no encontrada' });
    }

    res.json({ mensaje: 'Sede eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

module.exports = {
  obtenerSedes,
  obtenerSedePorId,
  crearSede,
  actualizarSede,
  eliminarSede,
};