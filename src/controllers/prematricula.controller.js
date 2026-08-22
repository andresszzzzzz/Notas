const Prematricula = require('../models/prematricula');

// Obtener todas las prematrículas
const obtenerPrematriculas = async (req, res) => {
  try {
    const prematriculas = await Prematricula.find()
      .populate('institucionId')
      .populate('anioAcademicoId');

    res.json(prematriculas);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Obtener una prematrícula por ID
const obtenerPrematriculaPorId = async (req, res) => {
  try {
    const prematricula = await Prematricula.findById(req.params.id)
      .populate('institucionId')
      .populate('anioAcademicoId');

    if (!prematricula) {
      return res.status(404).json({ mensaje: 'Prematrícula no encontrada' });
    }

    res.json(prematricula);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Crear una prematrícula
const crearPrematricula = async (req, res) => {
  try {
    const nuevaPrematricula = new Prematricula(req.body);
    const prematriculaGuardada = await nuevaPrematricula.save();

    res.status(201).json(prematriculaGuardada);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Actualizar una prematrícula
const actualizarPrematricula = async (req, res) => {
  try {
    const prematriculaActualizada = await Prematricula.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!prematriculaActualizada) {
      return res.status(404).json({ mensaje: 'Prematrícula no encontrada' });
    }

    res.json(prematriculaActualizada);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Eliminar una prematrícula
const eliminarPrematricula = async (req, res) => {
  try {
    const prematriculaEliminada = await Prematricula.findByIdAndDelete(req.params.id);

    if (!prematriculaEliminada) {
      return res.status(404).json({ mensaje: 'Prematrícula no encontrada' });
    }

    res.json({ mensaje: 'Prematrícula eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

module.exports = {
  obtenerPrematriculas,
  obtenerPrematriculaPorId,
  crearPrematricula,
  actualizarPrematricula,
  eliminarPrematricula,
};