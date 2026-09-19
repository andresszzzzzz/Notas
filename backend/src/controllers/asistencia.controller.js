const Asistencia = require('../models/Asistencia');
const AnioAcademico = require('../models/AnioAcademico');
const Matricula = require('../models/Matricula');
const { ESTADOS_PERIODO } = require('../config/constants');

// Busca el subdocumento de período dentro del año académico. Devuelve null
// si ese número de período no está configurado en el cronograma.
const buscarPeriodo = (anioAcademico, numeroPeriodo) => {
  return anioAcademico.cronograma?.periodos?.find((p) => p.numero === numeroPeriodo) || null;
};

// Carga el año académico y valida que el período indicado permita registrar
// o modificar asistencia. Igual que en calificaciones, un período "cerrado"
// ya no admite cambios (evita alterar la asistencia después del cierre).
const validarEstadoPeriodo = async (anioAcademicoId, numeroPeriodo) => {
  const anioAcademico = await AnioAcademico.findById(anioAcademicoId);
  if (!anioAcademico) {
    return { ok: false, mensaje: 'Año académico no encontrado' };
  }

  const periodo = buscarPeriodo(anioAcademico, numeroPeriodo);
  if (!periodo) {
    return { ok: false, mensaje: `El período ${numeroPeriodo} no existe en el cronograma de este año académico` };
  }

  if (periodo.estado === ESTADOS_PERIODO.CERRADO) {
    return { ok: false, mensaje: `El período ${numeroPeriodo} está cerrado. No se puede registrar ni modificar asistencia en él.` };
  }

  return { ok: true, anioAcademico, periodo };
};

// Obtener todos los registros de asistencia (sin filtrar; para listados
// puntuales por estudiante o por grupo, usar los endpoints específicos de abajo)
const obtenerAsistencias = async (req, res) => {
  try {
    const asistencias = await Asistencia.find()
      .populate('institucionId')
      .populate('anioAcademicoId')
      .populate('grupoId')
      .populate('asignaturaId')
      .populate('estudianteId')
      .populate('docenteId');

    res.json(asistencias);
  } catch (error) {
    res.status(500).json({
      mensaje: error.message
    });
  }
};

// Obtener un registro de asistencia por ID
const obtenerAsistenciaPorId = async (req, res) => {
  try {
    const asistencia = await Asistencia.findById(req.params.id)
      .populate('institucionId')
      .populate('anioAcademicoId')
      .populate('grupoId')
      .populate('asignaturaId')
      .populate('estudianteId')
      .populate('docenteId');

    if (!asistencia) {
      return res.status(404).json({
        mensaje: 'Registro de asistencia no encontrado'
      });
    }

    res.json(asistencia);
  } catch (error) {
    res.status(500).json({
      mensaje: error.message
    });
  }
};

// Crear un registro de asistencia individual
const crearAsistencia = async (req, res) => {
  try {
    const { anioAcademicoId, periodo } = req.body;

    const validacion = await validarEstadoPeriodo(anioAcademicoId, periodo);
    if (!validacion.ok) {
      return res.status(400).json({ mensaje: validacion.mensaje });
    }

    const nuevaAsistencia = new Asistencia({
      ...req.body,
      docenteId: req.body.docenteId || req.usuario.id
    });
    const guardada = await nuevaAsistencia.save();

    res.status(201).json(guardada);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ mensaje: 'Ya existe un registro de asistencia para este estudiante, esta fecha y esta clase' });
    }
    res.status(400).json({
      mensaje: error.message
    });
  }
};

// Actualizar un registro de asistencia (ej. corregir el estado del día)
const actualizarAsistencia = async (req, res) => {
  try {
    const existente = await Asistencia.findById(req.params.id);
    if (!existente) {
      return res.status(404).json({ mensaje: 'Registro de asistencia no encontrado' });
    }

    // El período se valida siempre contra el registro existente, no contra
    // lo que venga en el body — así nadie puede "mover" un registro a otro
    // período para esquivar el bloqueo.
    const validacion = await validarEstadoPeriodo(existente.anioAcademicoId, existente.periodo);
    if (!validacion.ok) {
      return res.status(400).json({ mensaje: validacion.mensaje });
    }

    // No se permite cambiar el período, el año académico, el estudiante, la
    // fecha ni la clase desde aquí (para eso se elimina y se crea de nuevo).
    const { periodo, anioAcademicoId, estudianteId, fecha, asignaturaId, ...camposPermitidos } = req.body;

    const actualizada = await Asistencia.findByIdAndUpdate(
      req.params.id,
      camposPermitidos,
      {
        new: true,
        runValidators: true
      }
    );

    res.json(actualizada);
  } catch (error) {
    res.status(400).json({
      mensaje: error.message
    });
  }
};

// Eliminar un registro de asistencia
const eliminarAsistencia = async (req, res) => {
  try {
    const existente = await Asistencia.findById(req.params.id);
    if (!existente) {
      return res.status(404).json({ mensaje: 'Registro de asistencia no encontrado' });
    }

    const validacion = await validarEstadoPeriodo(existente.anioAcademicoId, existente.periodo);
    if (!validacion.ok) {
      return res.status(400).json({ mensaje: validacion.mensaje });
    }

    await Asistencia.findByIdAndDelete(req.params.id);

    res.json({
      mensaje: 'Registro de asistencia eliminado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      mensaje: error.message
    });
  }
};

// POST /api/asistencia/masivo
// Registra de una sola vez la asistencia de todo un grupo para una fecha
// (y opcionalmente una clase puntual). Body: {
//   institucionId, anioAcademicoId, grupoId, asignaturaId?, fecha, periodo,
//   asistencias: [{ estudianteId, estado, observacion? }]
// }
// Hace upsert: si ya existe el registro de ese estudiante para esa fecha+clase,
// actualiza el estado; si no existe, lo crea.
const registrarAsistenciaMasiva = async (req, res) => {
  try {
    const {
      institucionId, anioAcademicoId, grupoId, asignaturaId, fecha, periodo, asistencias
    } = req.body;

    if (!institucionId || !anioAcademicoId || !grupoId || !fecha || !periodo) {
      return res.status(400).json({
        mensaje: 'Faltan campos requeridos: institucionId, anioAcademicoId, grupoId, fecha, periodo'
      });
    }
    if (!Array.isArray(asistencias) || asistencias.length === 0) {
      return res.status(400).json({ mensaje: 'El campo "asistencias" debe ser un arreglo con al menos un estudiante' });
    }

    const validacion = await validarEstadoPeriodo(anioAcademicoId, periodo);
    if (!validacion.ok) {
      return res.status(400).json({ mensaje: validacion.mensaje });
    }

    // Solo se acepta registrar asistencia de estudiantes con matrícula activa
    // en ese grupo, para evitar registros de estudiantes trasladados o de otro grupo.
    const matriculasActivas = await Matricula.find({ grupoId, anioAcademicoId, estado: 'activa' }).select('estudianteId');
    const estudiantesValidos = new Set(matriculasActivas.map((m) => String(m.estudianteId)));

    const fechaNormalizada = new Date(fecha);
    const errores = [];
    const operaciones = [];

    asistencias.forEach((item, indice) => {
      const { estudianteId, estado, observacion } = item;

      if (!estudianteId) {
        errores.push({ indice, mensaje: 'Falta estudianteId' });
        return;
      }
      if (!estudiantesValidos.has(String(estudianteId))) {
        errores.push({ indice, estudianteId, mensaje: 'El estudiante no tiene matrícula activa en este grupo' });
        return;
      }
      if (!['presente', 'ausente', 'tarde', 'excusado'].includes(estado)) {
        errores.push({ indice, estudianteId, mensaje: 'estado debe ser presente, ausente, tarde o excusado' });
        return;
      }

      operaciones.push({
        updateOne: {
          filter: {
            institucionId, anioAcademicoId, estudianteId, fecha: fechaNormalizada, asignaturaId: asignaturaId || null
          },
          update: {
            $set: {
              estado, observacion, grupoId, periodo, docenteId: req.usuario.id
            },
            $setOnInsert: {
              institucionId, anioAcademicoId, estudianteId, fecha: fechaNormalizada, asignaturaId: asignaturaId || null
            }
          },
          upsert: true
        }
      });
    });

    if (operaciones.length === 0) {
      return res.status(400).json({ mensaje: 'Ningún estudiante pasó las validaciones', errores });
    }

    const resultado = await Asistencia.bulkWrite(operaciones);

    res.status(200).json({
      mensaje: `Se procesaron ${operaciones.length} registros de asistencia (${resultado.upsertedCount} nuevos, ${resultado.modifiedCount} actualizados)`,
      procesados: operaciones.length,
      nuevos: resultado.upsertedCount,
      actualizados: resultado.modifiedCount,
      errores: errores.length ? errores : undefined
    });
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// GET /api/asistencia/grupo/:grupoId?fecha=YYYY-MM-DD&asignaturaId=...
// Trae la asistencia de un grupo en una fecha puntual (para verla o para
// precargar el formulario de toma de asistencia del día).
const obtenerAsistenciaGrupoFecha = async (req, res) => {
  try {
    const { fecha, asignaturaId } = req.query;

    if (!fecha) {
      return res.status(400).json({ mensaje: 'Falta el parámetro fecha (YYYY-MM-DD)' });
    }

    const inicioDia = new Date(fecha);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(fecha);
    finDia.setHours(23, 59, 59, 999);

    const filtro = {
      grupoId: req.params.grupoId,
      fecha: { $gte: inicioDia, $lte: finDia }
    };
    if (asignaturaId) filtro.asignaturaId = asignaturaId;

    const asistencias = await Asistencia.find(filtro)
      .populate('estudianteId', 'nombres apellidos documento')
      .populate('asignaturaId', 'nombre')
      .populate('docenteId', 'nombres apellidos');

    res.json(asistencias);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// GET /api/asistencia/estudiante/:id?anioAcademicoId=&periodo=&asignaturaId=
// Resumen consolidado de asistencia de un estudiante: totales por estado y
// porcentaje de asistencia, con filtros opcionales.
const obtenerResumenEstudiante = async (req, res) => {
  try {
    const { anioAcademicoId, periodo, asignaturaId } = req.query;

    if (!anioAcademicoId) {
      return res.status(400).json({ mensaje: 'Falta el parámetro anioAcademicoId' });
    }

    const filtro = { estudianteId: req.params.id, anioAcademicoId };
    if (periodo) filtro.periodo = parseInt(periodo, 10);
    if (asignaturaId) filtro.asignaturaId = asignaturaId;

    const registros = await Asistencia.find(filtro).sort({ fecha: 1 });

    const totales = { presente: 0, ausente: 0, tarde: 0, excusado: 0 };
    registros.forEach((r) => { totales[r.estado] += 1; });

    const totalDias = registros.length;
    const diasAsistidos = totales.presente + totales.tarde; // tarde cuenta como asistencia parcial, no como falta
    const porcentajeAsistencia = totalDias > 0 ? (diasAsistidos / totalDias) * 100 : null;

    res.json({
      estudianteId: req.params.id,
      totalDias,
      totales,
      porcentajeAsistencia: porcentajeAsistencia != null ? Number(porcentajeAsistencia.toFixed(1)) : null,
      registros
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

module.exports = {
  obtenerAsistencias,
  obtenerAsistenciaPorId,
  crearAsistencia,
  actualizarAsistencia,
  eliminarAsistencia,
  registrarAsistenciaMasiva,
  obtenerAsistenciaGrupoFecha,
  obtenerResumenEstudiante
};