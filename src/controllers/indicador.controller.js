const Indicador = require("../models/indicador");

// Obtener todos los indicadores
const obtenerIndicadores = async (req, res) => {
  try {
    const indicadores = await Indicador.find()
      .populate("institucionId")
      .populate("anioAcademicoId")
      .populate("asignaturaId");

    res.json(indicadores);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Obtener un indicador por ID
const obtenerIndicadorPorId = async (req, res) => {
  try {
    const indicador = await Indicador.findById(req.params.id)
      .populate("institucionId")
      .populate("anioAcademicoId")
      .populate("asignaturaId");

    if (!indicador) {
      return res.status(404).json({ mensaje: "Indicador no encontrado" });
    }

    res.json(indicador);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Crear un indicador
const crearIndicador = async (req, res) => {
  try {
    const nuevoIndicador = new Indicador(req.body);
    const indicadorGuardado = await nuevoIndicador.save();

    res.status(201).json(indicadorGuardado);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Actualizar un indicador
const actualizarIndicador = async (req, res) => {
  try {
    const indicadorActualizado = await Indicador.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!indicadorActualizado) {
      return res.status(404).json({ mensaje: "Indicador no encontrado" });
    }

    res.json(indicadorActualizado);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Eliminar un indicador
const eliminarIndicador = async (req, res) => {
  try {
    const indicadorEliminado = await Indicador.findByIdAndDelete(req.params.id);

    if (!indicadorEliminado) {
      return res.status(404).json({ mensaje: "Indicador no encontrado" });
    }

    res.json({ mensaje: "Indicador eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

module.exports = {
  obtenerIndicadores,
  obtenerIndicadorPorId,
  crearIndicador,
  actualizarIndicador,
  eliminarIndicador,
};