const Calificacion = require('../models/Calificacion');
const AnioAcademico = require('../models/AnioAcademico');
const Institucion = require('../models/Institucion');
const { ESTADOS_PERIODO } = require('../config/constants');

// Busca el subdocumento de período dentro del año académico. Devuelve null
// si ese número de período no está configurado en el cronograma.
const buscarPeriodo = (anioAcademico, numeroPeriodo) => {
  return anioAcademico.cronograma?.periodos?.find((p) => p.numero === numeroPeriodo) || null;
};

// Carga el año académico y valida que el período indicado permita la acción
// que se está intentando ('escribir' cubre crear/actualizar/eliminar la nota
// normal; 'recuperar' es más permisivo porque la recuperación justamente se
// hace cuando el período normal ya cerró).
const validarEstadoPeriodo = async (anioAcademicoId, numeroPeriodo, accion = 'escribir') => {
  const anioAcademico = await AnioAcademico.findById(anioAcademicoId);
  if (!anioAcademico) {
    return { ok: false, mensaje: 'Año académico no encontrado' };
  }

  const periodo = buscarPeriodo(anioAcademico, numeroPeriodo);
  if (!periodo) {
    return { ok: false, mensaje: `El período ${numeroPeriodo} no existe en el cronograma de este año académico` };
  }

  if (accion === 'escribir' && periodo.estado === ESTADOS_PERIODO.CERRADO) {
    return { ok: false, mensaje: `El período ${numeroPeriodo} está cerrado. No se pueden crear ni modificar calificaciones normales en él.` };
  }

  if (accion === 'recuperar' && periodo.estado !== ESTADOS_PERIODO.EN_RECUPERACION) {
    return { ok: false, mensaje: `El período ${numeroPeriodo} no está habilitado para recuperaciones (estado actual: ${periodo.estado}).` };
  }

  return { ok: true, anioAcademico, periodo };
};

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

// Crear calificación
const crearCalificacion = async (req, res) => {
  try {
    const { anioAcademicoId, periodo } = req.body;

    const validacion = await validarEstadoPeriodo(anioAcademicoId, periodo, 'escribir');
    if (!validacion.ok) {
      return res.status(400).json({ mensaje: validacion.mensaje });
    }

    const nuevaCalificacion = new Calificacion(req.body);
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

    // El período se valida siempre contra el registro existente, no contra
    // lo que venga en el body — así nadie puede "mover" una nota a otro
    // período para esquivar el bloqueo.
    const validacion = await validarEstadoPeriodo(existente.anioAcademicoId, existente.periodo, 'escribir');
    if (!validacion.ok) {
      return res.status(400).json({ mensaje: validacion.mensaje });
    }

    // No se permite cambiar el período ni el año académico desde aquí.
    const { periodo, anioAcademicoId, ...camposPermitidos } = req.body;

    const actualizada = await Calificacion.findByIdAndUpdate(
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

// Eliminar calificación
const eliminarCalificacion = async (req, res) => {
  try {
    const existente = await Calificacion.findById(req.params.id);
    if (!existente) {
      return res.status(404).json({ mensaje: 'Calificación no encontrada' });
    }

    const validacion = await validarEstadoPeriodo(existente.anioAcademicoId, existente.periodo, 'escribir');
    if (!validacion.ok) {
      return res.status(400).json({ mensaje: validacion.mensaje });
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

// PUT /api/calificaciones/:id/recuperacion
// Registra la nota de recuperación de un período. Solo aplica si:
//  - la nota normal quedó por debajo de la nota mínima de aprobación, y
//  - el período está actualmente en estado "en_recuperacion" en el cronograma.
// La nota final que cuenta se calcula según la configuración de la institución
// (aproximaPromedio): si está activada, se promedia nota+recuperación; si no,
// la recuperación reemplaza directamente a la nota, sin superar la nota mínima
// (recuperar no debe dar mejor nota que haber aprobado normalmente).
const registrarRecuperacion = async (req, res) => {
  try {
    const { recuperacion } = req.body;
    if (recuperacion === undefined || recuperacion === null) {
      return res.status(400).json({ mensaje: 'Debes enviar la nota de recuperación en el campo "recuperacion"' });
    }

    const calificacion = await Calificacion.findById(req.params.id);
    if (!calificacion) {
      return res.status(404).json({ mensaje: 'Calificación no encontrada' });
    }

    const validacion = await validarEstadoPeriodo(calificacion.anioAcademicoId, calificacion.periodo, 'recuperar');
    if (!validacion.ok) {
      return res.status(400).json({ mensaje: validacion.mensaje });
    }

    const notaMinima = validacion.anioAcademico.configuracion?.notaMinima ?? 3.0;

    if (calificacion.nota === undefined || calificacion.nota === null || calificacion.nota >= notaMinima) {
      return res.status(400).json({
        mensaje: `Esta calificación no está por debajo de la nota mínima (${notaMinima}), no aplica para recuperación.`
      });
    }

    calificacion.recuperacion = recuperacion;

    const aproximaPromedio = validacion.anioAcademico.configuracion?.aproximaPromedio ?? true;
    const notaFinal = aproximaPromedio
      ? (calificacion.nota + recuperacion) / 2
      : recuperacion;

    // Recuperar nunca debe dar una nota mejor que haber aprobado directo.
    calificacion.nota = Math.min(notaFinal, notaMinima);
    calificacion.estado = 'recuperado';

    await calificacion.save();

    res.json({ mensaje: 'Recuperación registrada correctamente', calificacion });
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// PUT /api/calificaciones/:id/habilitacion
// Registra la nota de un examen de habilitación (recuperación de todo el año
// para una asignatura). Usa la configuración de la institución:
//  - notaHabilitaciones: nota máxima que se puede obtener al habilitar
//  - porcentajeHabilitaciones: peso del examen de habilitación sobre la nota final
const registrarHabilitacion = async (req, res) => {
  try {
    const { habilitacion } = req.body;
    if (habilitacion === undefined || habilitacion === null) {
      return res.status(400).json({ mensaje: 'Debes enviar la nota del examen en el campo "habilitacion"' });
    }

    const calificacion = await Calificacion.findById(req.params.id);
    if (!calificacion) {
      return res.status(404).json({ mensaje: 'Calificación no encontrada' });
    }

    const anioAcademico = await AnioAcademico.findById(calificacion.anioAcademicoId);
    if (!anioAcademico) {
      return res.status(404).json({ mensaje: 'Año académico no encontrado' });
    }

    const notaMinima = anioAcademico.configuracion?.notaMinima ?? 3.0;

    if (calificacion.nota === undefined || calificacion.nota === null || calificacion.nota >= notaMinima) {
      return res.status(400).json({
        mensaje: `Esta calificación no está por debajo de la nota mínima (${notaMinima}), no aplica para habilitación.`
      });
    }

    const institucion = await Institucion.findById(calificacion.institucionId).select('configuracion');
    const notaHabilitaciones = institucion?.configuracion?.notaHabilitaciones ?? notaMinima;
    const porcentajeHabilitaciones = (institucion?.configuracion?.porcentajeHabilitaciones ?? 60) / 100;

    calificacion.habilitacion = habilitacion;

    const notaPonderada = calificacion.nota * (1 - porcentajeHabilitaciones) + habilitacion * porcentajeHabilitaciones;

    // La nota final de una habilitación nunca puede superar el tope que
    // define la institución (aunque el examen haya sido perfecto).
    calificacion.nota = Math.min(notaPonderada, notaHabilitaciones);
    calificacion.estado = 'habilitado';

    await calificacion.save();

    res.json({ mensaje: 'Habilitación registrada correctamente', calificacion });
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

module.exports = {
  obtenerCalificaciones,
  obtenerCalificacionPorId,
  crearCalificacion,
  actualizarCalificacion,
  eliminarCalificacion,
  registrarRecuperacion,
  registrarHabilitacion,
};