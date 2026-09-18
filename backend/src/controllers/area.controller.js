const Area = require("../models/Area");

// Obtener todas las áreas
const obtenerAreas = async (req, res) => {
  try {
    const areas = await Area.find()
      .populate("institucionId", "nombre")
      .sort({ orden: 1 });

    res.json(areas);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener las áreas",
      error: error.message,
    });
  }
};

// Obtener áreas por institución
const obtenerAreasPorInstitucion = async (req, res) => {
  try {
    const areas = await Area.find({
      institucionId: req.params.institucionId,
    }).sort({ orden: 1 });

    res.json(areas);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener las áreas",
      error: error.message,
    });
  }
};

// Obtener área por ID
const obtenerAreaPorId = async (req, res) => {
  try {
    const area = await Area.findById(req.params.id)
      .populate("institucionId", "nombre");

    if (!area) {
      return res.status(404).json({
        mensaje: "Área no encontrada",
      });
    }

    res.json(area);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al buscar el área",
      error: error.message,
    });
  }
};

// Crear área
const crearArea = async (req, res) => {
  try {
    const area = new Area(req.body);
    await area.save();

    res.status(201).json({
      mensaje: "Área creada correctamente",
      area,
    });
  } catch (error) {
    res.status(400).json({
      mensaje: "Error al crear el área",
      error: error.message,
    });
  }
};

// Actualizar área
const actualizarArea = async (req, res) => {
  try {
    const area = await Area.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!area) {
      return res.status(404).json({
        mensaje: "Área no encontrada",
      });
    }

    res.json({
      mensaje: "Área actualizada correctamente",
      area,
    });
  } catch (error) {
    res.status(400).json({
      mensaje: "Error al actualizar el área",
      error: error.message,
    });
  }
};

// Eliminar área
const eliminarArea = async (req, res) => {
  try {
    const area = await Area.findByIdAndDelete(req.params.id);

    if (!area) {
      return res.status(404).json({
        mensaje: "Área no encontrada",
      });
    }

    res.json({
      mensaje: "Área eliminada correctamente",
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al eliminar el área",
      error: error.message,
    });
  }
};

// Obtener áreas por estado
const obtenerAreasPorEstado = async (req, res) => {
  try {
    const areas = await Area.find({
      estado: req.params.estado,
    }).sort({ orden: 1 });

    res.json(areas);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener las áreas",
      error: error.message,
    });
  }
};

module.exports = {
  obtenerAreas,
  obtenerAreasPorInstitucion,
  obtenerAreaPorId,
  crearArea,
  actualizarArea,
  eliminarArea,
  obtenerAreasPorEstado,
};
