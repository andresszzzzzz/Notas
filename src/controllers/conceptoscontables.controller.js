const ConceptosContables = require('../models/conceptoscontables');

// Obtener todos los conceptos
const obtenerConceptos = async (req, res) => {
  try {
    const conceptos = await ConceptosContables.find()
      .populate('institucionId');

    res.json(conceptos);
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al obtener los conceptos contables',
      error: error.message
    });
  }
};

// Obtener un concepto por ID
const obtenerConceptoPorId = async (req, res) => {
  try {
    const concepto = await ConceptosContables.findById(req.params.id)
      .populate('institucionId');

    if (!concepto) {
      return res.status(404).json({
        mensaje: 'Concepto no encontrado'
      });
    }

    res.json(concepto);
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al buscar el concepto',
      error: error.message
    });
  }
};

// Crear concepto
const crearConcepto = async (req, res) => {
  try {
    const nuevoConcepto = new ConceptosContables(req.body);
    const conceptoGuardado = await nuevoConcepto.save();

    res.status(201).json(conceptoGuardado);
  } catch (error) {
    res.status(400).json({
      mensaje: 'Error al crear el concepto',
      error: error.message
    });
  }
};

// Actualizar concepto
const actualizarConcepto = async (req, res) => {
  try {
    const conceptoActualizado = await ConceptosContables.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!conceptoActualizado) {
      return res.status(404).json({
        mensaje: 'Concepto no encontrado'
      });
    }

    res.json(conceptoActualizado);
  } catch (error) {
    res.status(400).json({
      mensaje: 'Error al actualizar el concepto',
      error: error.message
    });
  }
};

// Eliminar concepto
const eliminarConcepto = async (req, res) => {
  try {
    const conceptoEliminado = await ConceptosContables.findByIdAndDelete(req.params.id);

    if (!conceptoEliminado) {
      return res.status(404).json({
        mensaje: 'Concepto no encontrado'
      });
    }

    res.json({
      mensaje: 'Concepto eliminado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al eliminar el concepto',
      error: error.message
    });
  }
};

module.exports = {
  obtenerConceptos,
  obtenerConceptoPorId,
  crearConcepto,
  actualizarConcepto,
  eliminarConcepto,
};