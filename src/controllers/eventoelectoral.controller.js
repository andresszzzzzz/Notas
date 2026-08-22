const EventoElectoral = require("../models/eventoelectoral");

// Obtener todos los eventos electorales
const obtenerEventosElectorales = async (req, res) => {
  try {
    const eventos = await EventoElectoral.find()
      .populate("institucionId")
      .populate("candidatos.estudianteId");

    res.json(eventos);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener los eventos electorales",
      error: error.message
    });
  }
};

// Obtener un evento electoral por ID
const obtenerEventoElectoralPorId = async (req, res) => {
  try {
    const evento = await EventoElectoral.findById(req.params.id)
      .populate("institucionId")
      .populate("candidatos.estudianteId");

    if (!evento) {
      return res.status(404).json({
        mensaje: "Evento electoral no encontrado"
      });
    }

    res.json(evento);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al buscar el evento electoral",
      error: error.message
    });
  }
};

// Crear un evento electoral
const crearEventoElectoral = async (req, res) => {
  try {
    const nuevoEvento = new EventoElectoral(req.body);
    const eventoGuardado = await nuevoEvento.save();

    res.status(201).json(eventoGuardado);
  } catch (error) {
    res.status(400).json({
      mensaje: "Error al crear el evento electoral",
      error: error.message
    });
  }
};

// Actualizar un evento electoral
const actualizarEventoElectoral = async (req, res) => {
  try {
    const eventoActualizado = await EventoElectoral.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!eventoActualizado) {
      return res.status(404).json({
        mensaje: "Evento electoral no encontrado"
      });
    }

    res.json(eventoActualizado);
  } catch (error) {
    res.status(400).json({
      mensaje: "Error al actualizar el evento electoral",
      error: error.message
    });
  }
};

// Eliminar un evento electoral
const eliminarEventoElectoral = async (req, res) => {
  try {
    const eventoEliminado = await EventoElectoral.findByIdAndDelete(req.params.id);

    if (!eventoEliminado) {
      return res.status(404).json({
        mensaje: "Evento electoral no encontrado"
      });
    }

    res.json({
      mensaje: "Evento electoral eliminado correctamente"
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al eliminar el evento electoral",
      error: error.message
    });
  }
};

module.exports = {
  obtenerEventosElectorales,
  obtenerEventoElectoralPorId,
  crearEventoElectoral,
  actualizarEventoElectoral,
  eliminarEventoElectoral,
};