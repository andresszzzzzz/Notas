const CargaAcademica = require('../models/CargaAcademica');

// Obtener todas las cargas académicas
const obtenerCargasAcademicas = async (req, res) => {
  try {
    const cargas = await CargaAcademica.find()
      .populate('institucionId')
      .populate('anioAcademicoId')
      .populate('grupoId')
      .populate('asignaturaId')
      .populate('docenteId');

    res.json(cargas);
  } catch (error) {
    res.status(500).json({
      mensaje: error.message
    });
  }
};

// Obtener una carga académica por ID
const obtenerCargaAcademicaPorId = async (req, res) => {
  try {
    const carga = await CargaAcademica.findById(req.params.id)
      .populate('institucionId')
      .populate('anioAcademicoId')
      .populate('grupoId')
      .populate('asignaturaId')
      .populate('docenteId');

    if (!carga) {
      return res.status(404).json({
        mensaje: 'Carga académica no encontrada'
      });
    }

    res.json(carga);
  } catch (error) {
    res.status(500).json({
      mensaje: error.message
    });
  }
};

// Crear carga académica
const crearCargaAcademica = async (req, res) => {
  try {
    const nuevaCarga = new CargaAcademica(req.body);
    const guardada = await nuevaCarga.save();

    res.status(201).json(guardada);
  } catch (error) {
    res.status(400).json({
      mensaje: error.message
    });
  }
};

// Actualizar carga académica
const actualizarCargaAcademica = async (req, res) => {
  try {
    const actualizada = await CargaAcademica.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!actualizada) {
      return res.status(404).json({
        mensaje: 'Carga académica no encontrada'
      });
    }

    res.json(actualizada);
  } catch (error) {
    res.status(400).json({
      mensaje: error.message
    });
  }
};

// Eliminar carga académica
const eliminarCargaAcademica = async (req, res) => {
  try {
    const eliminada = await CargaAcademica.findByIdAndDelete(req.params.id);

    if (!eliminada) {
      return res.status(404).json({
        mensaje: 'Carga académica no encontrada'
      });
    }

    res.json({
      mensaje: 'Carga académica eliminada correctamente'
    });
  } catch (error) {
    res.status(500).json({
      mensaje: error.message
    });
  }
};

module.exports = {
  obtenerCargasAcademicas,
  obtenerCargaAcademicaPorId,
  crearCargaAcademica,
  actualizarCargaAcademica,
  eliminarCargaAcademica,
};