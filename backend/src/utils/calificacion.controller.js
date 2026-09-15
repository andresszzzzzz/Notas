const Calificacion = require('../models/Calificacion');
const AnioAcademico = require('../models/AnioAcademico');
const Matricula = require('../models/Matricula');
const CargaAcademica = require('../models/CargaAcademica');
const Usuario = require('../models/Usuario');
const { calcularConsolidadoAnio } = require('../utils/consolidado.util');

// Obtener todas las calificaciones
const obtenerCalificaciones = async (req, res) => {
  try {
    const calificaciones = await Calificacion.find()
      .populate('institucionId')
      .populate('anioAcademicoId')
      .populate('estudianteId')
      .populate('asignaturaId')
      .populate('grupoId')
      .populate('docenteId')
      .populate('indicadores.indicadorId')
      .populate('actividades.actividadId');

    res.json(calificaciones);
  } catch (error) {
    res.status(500).json({
      mensaje: error.message
    });
  }
};

// Obtener una calificación por ID
const obtenerCalificacionPorId = async (req, res) => {
  try {
    const calificacion = await Calificacion.findById(req.params.id)
      .populate('institucionId')
      .populate('anioAcademicoId')
      .populate('estudianteId')
      .populate('asignaturaId')
      .populate('grupoId')
      .populate('docenteId')
      .populate('indicadores.indicadorId')
      .populate('actividades.actividadId');

    if (!calificacion) {
      return res.status(404).json({
        mensaje: 'Calificación no encontrada'
      });
    }

    res.json(calificacion);
  } catch (error) {
    res.status(500).json({
      mensaje: error.message
    });
  }
};

// Busca el subdocumento de un período dentro de un AnioAcademico por su número.
const obtenerPeriodoAnio = (anioAcademico, numeroPeriodo) => {
  return (anioAcademico.cronograma?.periodos || []).find((p) => p.numero === numeroPeriodo) || null;
};

// Un período bloquea la escritura de notas normales si está "cerrado". El
// estado "en_recuperacion" sigue permitiendo escribir (es cuando se registran
// las recuperaciones), solo "cerrado" es definitivo.
const periodoPermiteEscritura = (periodoInfo) => !periodoInfo || periodoInfo.estado !== 'cerrado';

// Verifica que el usuario tenga derecho a calificar (crear/editar notas) en
// un grupo+asignatura+año dados:
// - admin/rector/coordinador de la institución: siempre pueden.
// - docente: solo si tiene una CargaAcademica activa con puedeCalificar=true
//   para ese grupo+asignatura+año.
const puedeCalificarGrupoAsignatura = async (req, { institucionId, anioAcademicoId, grupoId, asignaturaId }) => {
  const { tipoPerfil, id, institucionId: institucionUsuario } = req.usuario;

  if (String(institucionUsuario) !== String(institucionId)) return false;
  if (['admin', 'rector', 'coordinador'].includes(tipoPerfil)) return true;

  if (tipoPerfil === 'docente') {
    const carga = await CargaAcademica.findOne({
      institucionId, anioAcademicoId, grupoId, asignaturaId, docenteId: id, estado: 'activo', puedeCalificar: true
    });
    return !!carga;
  }

  return false;
};

// Crear calificación
const crearCalificacion = async (req, res) => {
  try {
    const { institucionId, anioAcademicoId, grupoId, asignaturaId, periodo } = req.body;

    const autorizado = await puedeCalificarGrupoAsignatura(req, { institucionId, anioAcademicoId, grupoId, asignaturaId });
    if (!autorizado) {
      return res.status(403).json({ mensaje: 'No tienes permisos para calificar esta asignatura en este grupo' });
    }

    const anioAcademico = await AnioAcademico.findById(anioAcademicoId);
    if (!anioAcademico) {
      return res.status(404).json({ mensaje: 'Año académico no encontrado' });
    }

    const periodoInfo = obtenerPeriodoAnio(anioAcademico, periodo);
    if (!periodoPermiteEscritura(periodoInfo)) {
      return res.status(400).json({ mensaje: `El período ${periodo} ya está cerrado. No se pueden registrar nuevas notas.` });
    }

    const nuevaCalificacion = new Calificacion({ ...req.body, docenteId: req.body.docenteId || req.usuario.id });
    const guardada = await nuevaCalificacion.save();

    res.status(201).json(guardada);
  } catch (error) {
    res.status(400).json({
      mensaje: error.message
    });
  }
};

// Actualizar calificación
const actualizarCalificacion = async (req, res) => {
  try {
    const existente = await Calificacion.findById(req.params.id);
    if (!existente) {
      return res.status(404).json({ mensaje: 'Calificación no encontrada' });
    }

    const autorizado = await puedeCalificarGrupoAsignatura(req, existente);
    if (!autorizado) {
      return res.status(403).json({ mensaje: 'No tienes permisos para editar esta calificación' });
    }

    const anioAcademico = await AnioAcademico.findById(existente.anioAcademicoId);
    const periodoInfo = anioAcademico ? obtenerPeriodoAnio(anioAcademico, existente.periodo) : null;

    // Solo se permite escribir en un período cerrado si lo que se está enviando
    // es una recuperación o habilitación (eso es precisamente para lo que sirve
    // la ventana de recuperación posterior al cierre del período normal).
    const soloRecuperacionOHabilitacion = Object.keys(req.body).every((campo) =>
      ['recuperacion', 'habilitacion', 'observacion', 'estado'].includes(campo)
    );

    if (!periodoPermiteEscritura(periodoInfo) && !soloRecuperacionOHabilitacion) {
      return res.status(400).json({
        mensaje: `El período ${existente.periodo} ya está cerrado. Solo se pueden registrar recuperaciones/habilitaciones.`
      });
    }

    const actualizada = await Calificacion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(actualizada);
  } catch (error) {
    res.status(400).json({
      mensaje: error.message
    });
  }
};

// Eliminar calificación
const eliminarCalificacion = async (req, res) => {
  try {
    const existente = await Calificacion.findById(req.params.id);
    if (!existente) {
      return res.status(404).json({ mensaje: 'Calificación no encontrada' });
    }

    const autorizado = await puedeCalificarGrupoAsignatura(req, existente);
    if (!autorizado) {
      return res.status(403).json({ mensaje: 'No tienes permisos para eliminar esta calificación' });
    }

    await Calificacion.findByIdAndDelete(req.params.id);

    res.json({
      mensaje: 'Calificación eliminada correctamente'
    });
  } catch (error) {
    res.status(500).json({
      mensaje: error.message
    });
  }
};

// POST /api/calificaciones/masivo
// Califica de una sola vez a todo un grupo en una asignatura y período.
// Body: {
//   institucionId, anioAcademicoId, grupoId, asignaturaId, periodo,
//   calificaciones: [{ estudianteId, nota, observacion? }]
// }
// Hace upsert: si ya existe la calificación de ese estudiante para ese
// período+asignatura, actualiza la nota; si no existe, la crea.
const calificarGrupoMasivo = async (req, res) => {
  try {
    const { institucionId, anioAcademicoId, grupoId, asignaturaId, periodo, calificaciones } = req.body;

    if (!institucionId || !anioAcademicoId || !grupoId || !asignaturaId || !periodo) {
      return res.status(400).json({
        mensaje: 'Faltan campos requeridos: institucionId, anioAcademicoId, grupoId, asignaturaId, periodo'
      });
    }
    if (!Array.isArray(calificaciones) || calificaciones.length === 0) {
      return res.status(400).json({ mensaje: 'El campo "calificaciones" debe ser un arreglo con al menos un estudiante' });
    }

    const autorizado = await puedeCalificarGrupoAsignatura(req, { institucionId, anioAcademicoId, grupoId, asignaturaId });
    if (!autorizado) {
      return res.status(403).json({ mensaje: 'No tienes permisos para calificar esta asignatura en este grupo' });
    }

    const anioAcademico = await AnioAcademico.findById(anioAcademicoId);
    if (!anioAcademico) {
      return res.status(404).json({ mensaje: 'Año académico no encontrado' });
    }

    const periodoInfo = obtenerPeriodoAnio(anioAcademico, periodo);
    if (!periodoPermiteEscritura(periodoInfo)) {
      return res.status(400).json({ mensaje: `El período ${periodo} ya está cerrado. No se pueden registrar nuevas notas.` });
    }

    // Solo se acepta calificar a estudiantes realmente matriculados y activos en ese grupo,
    // para evitar registrar notas de estudiantes trasladados o de otro grupo por error.
    const matriculasActivas = await Matricula.find({ grupoId, anioAcademicoId, estado: 'activa' }).select('estudianteId');
    const estudiantesValidos = new Set(matriculasActivas.map((m) => String(m.estudianteId)));

    const errores = [];
    const operaciones = [];

    calificaciones.forEach((item, indice) => {
      const { estudianteId, nota, observacion } = item;

      if (!estudianteId) {
        errores.push({ indice, mensaje: 'Falta estudianteId' });
        return;
      }
      if (!estudiantesValidos.has(String(estudianteId))) {
        errores.push({ indice, estudianteId, mensaje: 'El estudiante no tiene matrícula activa en este grupo' });
        return;
      }
      if (nota != null && (typeof nota !== 'number' || nota < 0 || nota > 5)) {
        errores.push({ indice, estudianteId, mensaje: 'La nota debe ser un número entre 0 y 5' });
        return;
      }

      operaciones.push({
        updateOne: {
          filter: { institucionId, anioAcademicoId, estudianteId, asignaturaId, periodo },
          update: {
            $set: {
              nota, observacion, grupoId, docenteId: req.usuario.id, fechaCalificacion: new Date()
            },
            $setOnInsert: { institucionId, anioAcademicoId, estudianteId, asignaturaId, periodo }
          },
          upsert: true
        }
      });
    });

    if (operaciones.length === 0) {
      return res.status(400).json({ mensaje: 'Ningún estudiante pasó las validaciones', errores });
    }

    const resultado = await Calificacion.bulkWrite(operaciones);

    res.status(200).json({
      mensaje: `Se procesaron ${operaciones.length} calificaciones (${resultado.upsertedCount} nuevas, ${resultado.modifiedCount} actualizadas)`,
      procesadas: operaciones.length,
      nuevas: resultado.upsertedCount,
      actualizadas: resultado.modifiedCount,
      errores: errores.length ? errores : undefined
    });
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// GET /api/calificaciones/estudiante/:id
// Devuelve las notas consolidadas de un estudiante para un año académico:
// definitiva por asignatura, resumen por área, promedio general y resultado.
// Query opcional: ?anioAcademicoId= (si no se envía, usa la matrícula activa del estudiante).
const consultarNotasConsolidadasEstudiante = async (req, res) => {
  try {
    const estudiante = await Usuario.findById(req.params.id).select('nombres apellidos documento institucionId tipoPerfil');
    if (!estudiante || estudiante.tipoPerfil !== 'estudiante') {
      return res.status(404).json({ mensaje: 'Estudiante no encontrado' });
    }

    // Permisos: mismo criterio que los reportes de estudiante individual.
    const { tipoPerfil, id, institucionId } = req.usuario;
    let autorizado = false;
    if (['admin', 'rector', 'coordinador', 'docente'].includes(tipoPerfil)) {
      autorizado = String(institucionId) === String(estudiante.institucionId);
    } else if (tipoPerfil === 'estudiante') {
      autorizado = String(id) === String(estudiante._id);
    } else if (tipoPerfil === 'acudiente') {
      const acudiente = await Usuario.findById(id).select('estudiantes');
      autorizado = !!acudiente && acudiente.estudiantes.some((rel) => String(rel.estudianteId) === String(estudiante._id));
    }
    if (!autorizado) {
      return res.status(403).json({ mensaje: 'No tienes permisos para ver las notas de este estudiante' });
    }

    let anioAcademicoId = req.query.anioAcademicoId;
    let matricula = null;

    if (!anioAcademicoId) {
      matricula = await Matricula.findOne({ estudianteId: estudiante._id, estado: 'activa' })
        .sort({ fechaMatricula: -1 })
        .populate('anioAcademicoId')
        .populate('grupoId', 'nombre grado');
      if (!matricula) {
        return res.status(404).json({ mensaje: 'El estudiante no tiene una matrícula activa. Especifica ?anioAcademicoId=' });
      }
      anioAcademicoId = matricula.anioAcademicoId._id;
    }

    const anioAcademico = matricula?.anioAcademicoId || await AnioAcademico.findById(anioAcademicoId);
    if (!anioAcademico) {
      return res.status(404).json({ mensaje: 'Año académico no encontrado' });
    }

    const calificaciones = await Calificacion.find({ estudianteId: estudiante._id, anioAcademicoId })
      .populate({
        path: 'asignaturaId',
        select: 'nombre orden areaId',
        populate: { path: 'areaId', select: 'nombre orden' }
      });

    if (calificaciones.length === 0) {
      return res.status(404).json({ mensaje: 'No hay calificaciones registradas para este estudiante en este año académico' });
    }

    const consolidado = calcularConsolidadoAnio(calificaciones, anioAcademico.configuracion);

    res.json({
      estudiante: {
        id: estudiante._id,
        nombreCompleto: `${estudiante.nombres} ${estudiante.apellidos}`,
        documento: estudiante.documento
      },
      anioAcademico: { id: anioAcademico._id, anio: anioAcademico.anio },
      grupo: matricula?.grupoId || null,
      ...consolidado
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// POST /api/calificaciones/cerrar-periodo
// Cierra formalmente un período: valida que todas las notas esperadas estén
// registradas (a menos que se envíe forzar=true) y marca el período como
// "cerrado" en el AnioAcademico, bloqueando así la edición normal de notas.
// Body: { anioAcademicoId, periodo, grupoId? (opcional: cierra solo ese grupo o valida todos), forzar? }
const cerrarPeriodo = async (req, res) => {
  try {
    const { anioAcademicoId, periodo, grupoId, forzar } = req.body;

    if (!anioAcademicoId || !periodo) {
      return res.status(400).json({ mensaje: 'Faltan campos requeridos: anioAcademicoId, periodo' });
    }

    const anioAcademico = await AnioAcademico.findById(anioAcademicoId);
    if (!anioAcademico) {
      return res.status(404).json({ mensaje: 'Año académico no encontrado' });
    }

    // Cerrar un período es una decisión institucional, no de un docente individual.
    const { tipoPerfil, institucionId } = req.usuario;
    if (!['admin', 'rector', 'coordinador'].includes(tipoPerfil) || String(institucionId) !== String(anioAcademico.institucionId)) {
      return res.status(403).json({ mensaje: 'Solo el rector, coordinador o administrador de la institución pueden cerrar un período' });
    }

    const periodoInfo = obtenerPeriodoAnio(anioAcademico, periodo);
    if (!periodoInfo) {
      return res.status(404).json({ mensaje: `El período ${periodo} no existe en el cronograma de este año académico` });
    }
    if (periodoInfo.estado === 'cerrado') {
      return res.status(400).json({ mensaje: `El período ${periodo} ya se encuentra cerrado` });
    }

    // Validación de completitud: por cada carga académica activa (docente+asignatura+grupo),
    // deben existir notas para todos los estudiantes con matrícula activa en ese grupo.
    if (!forzar) {
      const filtroCargas = { institucionId: anioAcademico.institucionId, anioAcademicoId, estado: 'activo' };
      if (grupoId) filtroCargas.grupoId = grupoId;
      const cargas = await CargaAcademica.find(filtroCargas);

      const faltantes = [];
      for (const carga of cargas) {
        const matriculasActivas = await Matricula.find({ grupoId: carga.grupoId, anioAcademicoId, estado: 'activa' }).select('estudianteId');
        const totalEsperado = matriculasActivas.length;
        if (totalEsperado === 0) continue;

        const totalRegistrado = await Calificacion.countDocuments({
          grupoId: carga.grupoId, asignaturaId: carga.asignaturaId, anioAcademicoId, periodo,
          nota: { $ne: null }
        });

        if (totalRegistrado < totalEsperado) {
          faltantes.push({
            grupoId: carga.grupoId, asignaturaId: carga.asignaturaId,
            esperadas: totalEsperado, registradas: totalRegistrado, faltan: totalEsperado - totalRegistrado
          });
        }
      }

      if (faltantes.length > 0) {
        return res.status(400).json({
          mensaje: `No se puede cerrar el período: hay ${faltantes.length} combinación(es) de grupo/asignatura con notas incompletas. Envía "forzar": true para cerrar de todas formas.`,
          faltantes
        });
      }
    }

    periodoInfo.estado = 'cerrado';
    await anioAcademico.save();

    res.json({
      mensaje: `Período ${periodo} (${periodoInfo.nombre}) cerrado correctamente`,
      periodo: periodoInfo
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

module.exports = {
  obtenerCalificaciones,
  obtenerCalificacionPorId,
  crearCalificacion,
  actualizarCalificacion,
  eliminarCalificacion,
  calificarGrupoMasivo,
  consultarNotasConsolidadasEstudiante,
  cerrarPeriodo
};