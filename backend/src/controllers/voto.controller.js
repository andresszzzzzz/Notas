const Voto = require('../models/Voto');

// Obtener todos los votos
const obtenerVotos = async (req, res) => {
  try {
    const votos = await Voto.find()
      .populate('eventoId')
      .populate('estudianteId');

    res.json(votos);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Obtener un voto por ID
const obtenerVotoPorId = async (req, res) => {
  try {
    const voto = await Voto.findById(req.params.id)
      .populate('eventoId')
      .populate('estudianteId');

    if (!voto) {
      return res.status(404).json({ mensaje: 'Voto no encontrado' });
    }

    res.json(voto);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Registrar un voto
const crearVoto = async (req, res) => {
  try {
    const nuevoVoto = new Voto(req.body);
    const votoGuardado = await nuevoVoto.save();

    res.status(201).json(votoGuardado);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Actualizar un voto
const actualizarVoto = async (req, res) => {
  try {
    const votoActualizado = await Voto.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!votoActualizado) {
      return res.status(404).json({ mensaje: 'Voto no encontrado' });
    }

    res.json(votoActualizado);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Eliminar un voto
const eliminarVoto = async (req, res) => {
  try {
    const votoEliminado = await Voto.findByIdAndDelete(req.params.id);

    if (!votoEliminado) {
      return res.status(404).json({ mensaje: 'Voto no encontrado' });
    }

    res.json({ mensaje: 'Voto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

module.exports = {
  obtenerVotos,
  obtenerVotoPorId,
  crearVoto,
  actualizarVoto,
  eliminarVoto,
};
