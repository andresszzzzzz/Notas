const Excusas = require("../models/excusas");

// Obtener todas las excusas
const obtenerExcusas = async (req, res) => {
  try {
    const excusas = await Excusas.find()
      .populate("institucionId")
      .populate("anioAcademicoId")
      .populate("docenteId")
      .populate("aprobadoPor");

    res.json(excusas);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener las excusas",
      error: error.message
    });
  }
};

// Obtener una excusa por ID
const obtenerExcusaPorId = async (req, res) => {
  try {
    const excusa = await Excusas.findById(req.params.id)
      .populate("institucionId")
      .populate("anioAcademicoId")
      .populate("docenteId")
      .populate("aprobadoPor");

    if (!excusa) {
      return res.status(404).json({
        mensaje: "Excusa no encontrada"
      });
    }

    res.json(excusa);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al buscar la excusa",
      error: error.message
    });
  }
};

// Crear una excusa
const crearExcusa = async (req, res) => {
  try {
    const nuevaExcusa = new Excusas(req.body);
    const excusaGuardada = await nuevaExcusa.save();

    res.status(201).json(excusaGuardada);
  } catch (error) {
    res.status(400).json({
      mensaje: "Error al crear la excusa",
      error: error.message
    });
  }
};

// Actualizar una excusa
const actualizarExcusa = async (req, res) => {
  try {
    const excusaActualizada = await Excusas.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!excusaActualizada) {
      return res.status(404).json({
        mensaje: "Excusa no encontrada"
      });
    }

    res.json(excusaActualizada);
  } catch (error) {
    res.status(400).json({
      mensaje: "Error al actualizar la excusa",
      error: error.message
    });
  }
};

// Eliminar una excusa
const eliminarExcusa = async (req, res) => {
  try {
    const excusaEliminada = await Excusas.findByIdAndDelete(req.params.id);

    if (!excusaEliminada) {
      return res.status(404).json({
        mensaje: "Excusa no encontrada"
      });
    }

    res.json({
      mensaje: "Excusa eliminada correctamente"
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al eliminar la excusa",
      error: error.message
    });
  }
};

module.exports = {
  obtenerExcusas,
  obtenerExcusaPorId,
  crearExcusa,
  actualizarExcusa,
  eliminarExcusa,
};