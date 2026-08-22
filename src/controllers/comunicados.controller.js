const Comunicados = require('../models/comunicados');

// Obtener todos los comunicados
const obtenerComunicados = async (req, res) => {
  try {
    const comunicados = await Comunicados.find()
      .populate('institucionId')
      .populate('remitenteId')
      .populate('destinatarios.usuarioId')
      .populate('destinatarios.grupoId')
      .populate('leido.usuarioId')
      .sort({ createdAt: -1 });

    res.json(comunicados);
  } catch (error) {
    res.status(500).json({
      mensaje: error.message
    });
  }
};

// Obtener un comunicado por ID
const obtenerComunicadoPorId = async (req, res) => {
  try {
    const comunicado = await Comunicados.findById(req.params.id)
      .populate('institucionId')
      .populate('remitenteId')
      .populate('destinatarios.usuarioId')
      .populate('destinatarios.grupoId')
      .populate('leido.usuarioId');

    if (!comunicado) {
      return res.status(404).json({
        mensaje: 'Comunicado no encontrado'
      });
    }

    res.json(comunicado);
  } catch (error) {
    res.status(500).json({
      mensaje: error.message
    });
  }
};

// Crear comunicado
const crearComunicado = async (req, res) => {
  try {
    const nuevoComunicado = new Comunicados(req.body);
    const guardado = await nuevoComunicado.save();

    res.status(201).json(guardado);
  } catch (error) {
    res.status(400).json({
      mensaje: error.message
    });
  }
};

// Actualizar comunicado
const actualizarComunicado = async (req, res) => {
  try {
    const actualizado = await Comunicados.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!actualizado) {
      return res.status(404).json({
        mensaje: 'Comunicado no encontrado'
      });
    }

    res.json(actualizado);
  } catch (error) {
    res.status(400).json({
      mensaje: error.message
    });
  }
};

// Eliminar comunicado
const eliminarComunicado = async (req, res) => {
  try {
    const eliminado = await Comunicados.findByIdAndDelete(req.params.id);

    if (!eliminado) {
      return res.status(404).json({
        mensaje: 'Comunicado no encontrado'
      });
    }

    res.json({
      mensaje: 'Comunicado eliminado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      mensaje: error.message
    });
  }
};

module.exports = {
  obtenerComunicados,
  obtenerComunicadoPorId,
  crearComunicado,
  actualizarComunicado,
  eliminarComunicado,
};
