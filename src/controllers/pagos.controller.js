const Pagos = require('../models/pagos');

// Obtener todos los pagos
const obtenerPagos = async (req, res) => {
  try {
    const pagos = await Pagos.find()
      .populate('institucionId')
      .populate('anioAcademicoId')
      .populate('estudianteId')
      .populate('conceptoId')
      .populate('recibidoPor');

    res.json(pagos);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Obtener un pago por ID
const obtenerPagoPorId = async (req, res) => {
  try {
    const pago = await Pagos.findById(req.params.id)
      .populate('institucionId')
      .populate('anioAcademicoId')
      .populate('estudianteId')
      .populate('conceptoId')
      .populate('recibidoPor');

    if (!pago) {
      return res.status(404).json({ mensaje: 'Pago no encontrado' });
    }

    res.json(pago);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Crear un pago
const crearPago = async (req, res) => {
  try {
    const nuevoPago = new Pagos(req.body);
    const pagoGuardado = await nuevoPago.save();

    res.status(201).json(pagoGuardado);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Actualizar un pago
const actualizarPago = async (req, res) => {
  try {
    const pagoActualizado = await Pagos.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!pagoActualizado) {
      return res.status(404).json({ mensaje: 'Pago no encontrado' });
    }

    res.json(pagoActualizado);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Eliminar un pago
const eliminarPago = async (req, res) => {
  try {
    const pagoEliminado = await Pagos.findByIdAndDelete(req.params.id);

    if (!pagoEliminado) {
      return res.status(404).json({ mensaje: 'Pago no encontrado' });
    }

    res.json({ mensaje: 'Pago eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

module.exports = {
  obtenerPagos,
  obtenerPagoPorId,
  crearPago,
  actualizarPago,
  eliminarPago,
};