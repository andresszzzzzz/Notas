const Elecciones = require("../models/elecciones");

// Obtener todas las elecciones
const obtenerElecciones = async (req, res) => {
  try {
    const elecciones = await Elecciones.find()
      .populate("institucionId")
      .populate("anioAcademicoId")
      .populate("candidatos.estudianteId")
      .populate("votos.estudianteId")
      .populate("permisos.grupoId");

    res.json(elecciones);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener las elecciones",
      error: error.message
    });
  }
};

// Obtener una elección por ID
const obtenerEleccionPorId = async (req, res) => {
  try {
    const eleccion = await Elecciones.findById(req.params.id)
      .populate("institucionId")
      .populate("anioAcademicoId")
      .populate("candidatos.estudianteId")
      .populate("votos.estudianteId")
      .populate("permisos.grupoId");

    if (!eleccion) {
      return res.status(404).json({
        mensaje: "Elección no encontrada"
      });
    }

    res.json(eleccion);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al buscar la elección",
      error: error.message
    });
  }
};

// Crear una elección
const crearEleccion = async (req, res) => {
  try {
    const nuevaEleccion = new Elecciones(req.body);
    const eleccionGuardada = await nuevaEleccion.save();

    res.status(201).json(eleccionGuardada);
  } catch (error) {
    res.status(400).json({
      mensaje: "Error al crear la elección",
      error: error.message
    });
  }
};

// Actualizar una elección
const actualizarEleccion = async (req, res) => {
  try {
    const eleccionActualizada = await Elecciones.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!eleccionActualizada) {
      return res.status(404).json({
        mensaje: "Elección no encontrada"
      });
    }

    res.json(eleccionActualizada);
  } catch (error) {
    res.status(400).json({
      mensaje: "Error al actualizar la elección",
      error: error.message
    });
  }
};

// Eliminar una elección
const eliminarEleccion = async (req, res) => {
  try {
    const eleccionEliminada = await Elecciones.findByIdAndDelete(req.params.id);

    if (!eleccionEliminada) {
      return res.status(404).json({
        mensaje: "Elección no encontrada"
      });
    }

    res.json({
      mensaje: "Elección eliminada correctamente"
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al eliminar la elección",
      error: error.message
    });
  }
};

module.exports = {
  obtenerElecciones,
  obtenerEleccionPorId,
  crearEleccion,
  actualizarEleccion,
  eliminarEleccion,
};