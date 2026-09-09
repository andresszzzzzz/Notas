const SolicitudRegistro = require('../models/SolicitudRegistro');

// Obtener todas las solicitudes
const obtenerSolicitudes = async (req, res) => {
  try {
    const solicitudes = await SolicitudRegistro.find()
      .populate('nucleoId')
      .populate('procesadoPor');

    res.json(solicitudes);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Obtener una solicitud por ID
const obtenerSolicitudPorId = async (req, res) => {
  try {
    const solicitud = await SolicitudRegistro.findById(req.params.id)
      .populate('nucleoId')
      .populate('procesadoPor');

    if (!solicitud) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    res.json(solicitud);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Crear una solicitud
const crearSolicitud = async (req, res) => {
  try {
    const nuevaSolicitud = new SolicitudRegistro(req.body);
    const solicitudGuardada = await nuevaSolicitud.save();

    res.status(201).json(solicitudGuardada);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Actualizar una solicitud
const actualizarSolicitud = async (req, res) => {
  try {
    const solicitudActualizada = await SolicitudRegistro.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!solicitudActualizada) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    res.json(solicitudActualizada);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Eliminar una solicitud
const eliminarSolicitud = async (req, res) => {
  try {
    const solicitudEliminada = await SolicitudRegistro.findByIdAndDelete(req.params.id);

    if (!solicitudEliminada) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    res.json({ mensaje: 'Solicitud eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

module.exports = {
  obtenerSolicitudes,
  obtenerSolicitudPorId,
  crearSolicitud,
  actualizarSolicitud,
  eliminarSolicitud,
};
