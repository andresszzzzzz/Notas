const DireccionNucleo = require('../models/DireccionNucleo');
const SolicitudRegistro = require('../models/SolicitudRegistro');

// Lista los núcleos activos disponibles para el formulario público de auto-registro.
const listarNucleos = async (req, res) => {
  try {
    const nucleos = await DireccionNucleo.find({ estado: 'activo' }).select('nombre municipio departamento');
    res.status(200).json(nucleos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al listar núcleos', error: error.message });
  }
};

// Un colegio envía su solicitud de auto-registro a un núcleo.
const crearSolicitud = async (req, res) => {
  try {
    const solicitud = new SolicitudRegistro(req.body);
    await solicitud.save();
    res.status(201).json({
      mensaje: 'Solicitud enviada correctamente. Será revisada por la Dirección de Núcleo.',
      solicitudId: solicitud._id
    });
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al enviar la solicitud', error: error.message });
  }
};

// Consulta pública del estado de una solicitud (sin exponer datos sensibles).
const consultarSolicitud = async (req, res) => {
  try {
    const solicitud = await SolicitudRegistro.findById(req.params.id).select('nombre estado observaciones createdAt');

    if (!solicitud) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    res.status(200).json(solicitud);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al consultar la solicitud', error: error.message });
  }
};

module.exports = {
  listarNucleos,
  crearSolicitud,
  consultarSolicitud
};
