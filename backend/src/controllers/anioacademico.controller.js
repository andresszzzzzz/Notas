const anioacademico = require("../models/AnioAcademico");
const Matricula = require("../models/Matricula");
const { calcularResultadosAnio, ejecutarCierreAnio } = require("../services/promocionService");

// Obtener todos los años académicos
const obtenerAnios = async (req, res) => {
  try {
    const anios = await anioacademico.find()
      .populate("institucionId", "nombre")
      .sort({ anio: -1 });

    res.json(anios);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener los años académicos",
      error: error.message,
    });
  }
};

// Obtener años por institución
const obtenerAniosPorInstitucion = async (req, res) => {
  try {
    const anios = await anioacademico.find({
      institucionId: req.params.institucionId,
    }).sort({ anio: -1 });

    res.json(anios);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener los años académicos",
      error: error.message,
    });
  }
};

// Obtener año académico por ID
const obtenerAnioPorId = async (req, res) => {
  try {
    const anio = await anioacademico.findById(req.params.id)
      .populate("institucionId", "nombre");

    if (!anio) {
      return res.status(404).json({
        mensaje: "Año académico no encontrado",
      });
    }

    res.json(anio);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al buscar el año académico",
      error: error.message,
    });
  }
};

// Crear año académico
const crearAnio = async (req, res) => {
  try {
    const nuevoAnio = new anioacademico(req.body);
    await nuevoAnio.save();

    res.status(201).json({
      mensaje: "Año académico creado correctamente",
      anioAcademico: nuevoAnio,
    });
  } catch (error) {
    res.status(400).json({
      mensaje: "Error al crear el año académico",
      error: error.message,
    });
  }
};

// Actualizar año académico
const actualizarAnio = async (req, res) => {
  try {
    const anio = await anioacademico.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!anio) {
      return res.status(404).json({
        mensaje: "Año académico no encontrado",
      });
    }

    res.json({
      mensaje: "Año académico actualizado correctamente",
      anioAcademico: anio,
    });
  } catch (error) {
    res.status(400).json({
      mensaje: "Error al actualizar el año académico",
      error: error.message,
    });
  }
};

// Eliminar año académico
const eliminarAnio = async (req, res) => {
  try {
    const anio = await anioacademico.findByIdAndDelete(req.params.id);

    if (!anio) {
      return res.status(404).json({
        mensaje: "Año académico no encontrado",
      });
    }

    res.json({
      mensaje: "Año académico eliminado correctamente",
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al eliminar el año académico",
      error: error.message,
    });
  }
};

// Obtener año académico por estado
const obtenerAniosPorEstado = async (req, res) => {
  try {
    const anios = await anioacademico.find({
      estado: req.params.estado,
    }).populate("institucionId", "nombre");

    res.json(anios);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener los años académicos",
      error: error.message,
    });
  }
};

// Agregar un período
const agregarPeriodo = async (req, res) => {
  try {
    const anio = await anioacademico.findById(req.params.id);

    if (!anio) {
      return res.status(404).json({
        mensaje: "Año académico no encontrado",
      });
    }

    anio.cronograma.periodos.push(req.body);
    await anio.save();

    res.status(201).json({
      mensaje: "Período agregado correctamente",
      periodos: anio.cronograma.periodos,
    });
  } catch (error) {
    res.status(400).json({
      mensaje: "Error al agregar el período",
      error: error.message,
    });
  }
};

// Actualizar un período
const actualizarPeriodo = async (req, res) => {
  try {
    const anio = await anioacademico.findById(req.params.id);

    if (!anio) {
      return res.status(404).json({
        mensaje: "Año académico no encontrado",
      });
    }

    const periodo = anio.cronograma.periodos.id(req.params.periodoId);

    if (!periodo) {
      return res.status(404).json({
        mensaje: "Período no encontrado",
      });
    }

    Object.assign(periodo, req.body);
    await anio.save();

    res.json({
      mensaje: "Período actualizado correctamente",
      periodo,
    });
  } catch (error) {
    res.status(400).json({
      mensaje: "Error al actualizar el período",
      error: error.message,
    });
  }
};

// Eliminar un período
const eliminarPeriodo = async (req, res) => {
  try {
    const anio = await anioacademico.findById(req.params.id);

    if (!anio) {
      return res.status(404).json({
        mensaje: "Año académico no encontrado",
      });
    }

    anio.cronograma.periodos.pull(req.params.periodoId);
    await anio.save();

    res.json({
      mensaje: "Período eliminado correctamente",
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al eliminar el período",
      error: error.message,
    });
  }
};

// GET /api/anios-academicos/:id/promocion/previsualizar
// Calcula promovidos/reprobados SIN guardar nada. Sirve para que secretaría
// revise el resultado antes de ejecutar el cierre definitivo.
const previsualizarCierre = async (req, res) => {
  try {
    const reporte = await calcularResultadosAnio(req.params.id);
    res.json(reporte);
  } catch (error) {
    res.status(error.status || 500).json({
      mensaje: error.message || "Error al calcular la previsualización de cierre",
    });
  }
};

// POST /api/anios-academicos/:id/promocion/cierre
// Ejecuta el cierre de año: marca cada matrícula como promovido/no promovido,
// cambia el estado del año académico a 'finalizado' y, si se envía un
// mapeo de grupos, crea automáticamente la matrícula del siguiente año
// para los estudiantes promovidos.
//
// Body esperado:
// {
//   "forzar": false,                 // opcional, permite cerrar con períodos abiertos
//   "mapeoGrupos": [                  // opcional, para matricular al año siguiente
//     { "grupoActualId": "...", "grupoSiguienteId": "..." }
//   ]
// }
const cerrarAnio = async (req, res) => {
  try {
    const { forzar, mapeoGrupos } = req.body;
    const reporte = await ejecutarCierreAnio(req.params.id, { forzar, mapeoGrupos });

    res.json({
      mensaje: "Cierre de año ejecutado correctamente",
      ...reporte,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      mensaje: error.message || "Error al ejecutar el cierre de año",
    });
  }
};

// GET /api/anios-academicos/:id/promocion/listado?tipo=promovidos|reprobados|todos
// Lista, a partir de las matrículas ya actualizadas por el cierre, quiénes
// quedaron promovidos y quiénes no. Requiere haber ejecutado /cierre antes
// (si no, el campo "promovido" de la matrícula todavía es null).
const listadoPromocion = async (req, res) => {
  try {
    const { tipo = "todos" } = req.query;

    const filtro = { anioAcademicoId: req.params.id, estado: "activa" };
    if (tipo === "promovidos") filtro.promovido = true;
    if (tipo === "reprobados") filtro.promovido = false;

    const matriculas = await Matricula.find(filtro)
      .populate("estudianteId", "nombres apellidos documento")
      .populate("grupoId", "nombre grado")
      .sort({ "grupoId.grado": 1 });

    res.json(matriculas);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener el listado de promoción",
      error: error.message,
    });
  }
};

module.exports = {
  obtenerAnios,
  obtenerAniosPorInstitucion,
  obtenerAnioPorId,
  crearAnio,
  actualizarAnio,
  eliminarAnio,
  obtenerAniosPorEstado,
  agregarPeriodo,
  actualizarPeriodo,
  eliminarPeriodo,
  previsualizarCierre,
  cerrarAnio,
  listadoPromocion,
};