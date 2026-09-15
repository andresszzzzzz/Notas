const Matricula = require('../models/Matricula');
const Calificacion = require('../models/Calificacion');
const Institucion = require('../models/Institucion');
const Usuario = require('../models/Usuario');
const Grupo = require('../models/Grupo');
const AnioAcademico = require('../models/AnioAcademico');
const Observador = require('../models/Observador');
const { generarBoletinPeriodoPDF } = require('../services/pdf/boletin.service');
const { generarConstanciaEstudioPDF, generarConstanciaNotasPDF } = require('../services/pdf/constancia.service');
const { generarCertificadoNotasPDF } = require('../services/pdf/certificado.service');
const { generarCarnetPDF } = require('../services/pdf/carnet.service');
const { generarEstadisticasGrupoPDF } = require('../services/pdf/estadisticas.service');
const { generarEvolucionGrupoPDF } = require('../services/pdf/evolucion.service');
const { generarAcumulativoGrupoPDF } = require('../services/pdf/acumulativo.service');
const { generarObservadorPDF } = require('../services/pdf/observador.service');
const { generarLibroFinalPDF } = require('../services/pdf/libroFinal.service');
const { generarPromovidosPDF } = require('../services/pdf/promovidos.service');
const { generarFallasPDF } = require('../services/pdf/fallas.service');
const { calcularConsolidadoAnio } = require('../utils/consolidado.util');

// Etiquetas legibles para el pie del carnet, según el rol del usuario.
const ETIQUETAS_ROL = {
  estudiante: 'ESTUDIANTE',
  docente: 'DOCENTE',
  admin: 'ADMINISTRATIVO',
  rector: 'RECTOR',
  coordinador: 'COORDINADOR'
};

// Verifica que quien pide un reporte de un estudiante tenga derecho a verlo:
// - admin/rector/coordinador/docente de la misma institución del estudiante
// - el propio estudiante
// - un acudiente que tenga a ese estudiante entre sus relaciones
const puedeVerReporteEstudiante = async (req, matricula) => {
  const { tipoPerfil, id, institucionId } = req.usuario;

  if (['admin', 'rector', 'coordinador', 'docente'].includes(tipoPerfil)) {
    return String(institucionId) === String(matricula.institucionId);
  }

  if (tipoPerfil === 'estudiante') {
    return String(id) === String(matricula.estudianteId);
  }

  if (tipoPerfil === 'acudiente') {
    const acudiente = await Usuario.findById(id).select('estudiantes');
    if (!acudiente) return false;
    return acudiente.estudiantes.some((rel) => String(rel.estudianteId) === String(matricula.estudianteId));
  }

  return false;
};

// Verifica que quien pide el carnet de un docente/administrativo tenga derecho a verlo:
// - el propio usuario
// - admin/rector/coordinador de la misma institución
const puedeVerCarnetPersonal = (req, usuarioObjetivo) => {
  const { tipoPerfil, id, institucionId } = req.usuario;

  if (String(id) === String(usuarioObjetivo._id)) return true;

  if (['admin', 'rector', 'coordinador'].includes(tipoPerfil)) {
    return String(institucionId) === String(usuarioObjetivo.institucionId);
  }

  return false;
};

// Verifica que quien pide un reporte de TODO UN GRUPO (estadísticas, libro final,
// acumulativo, fallas, evolución) tenga derecho a verlo: solo personal de la
// institución (admin/rector/coordinador/docente). Estudiantes y acudientes no
// acceden a reportes agregados de grupo.
const puedeVerReporteGrupo = (req, grupo) => {
  const { tipoPerfil, institucionId } = req.usuario;
  return ['admin', 'rector', 'coordinador', 'docente'].includes(tipoPerfil)
    && String(institucionId) === String(grupo.institucionId);
};

// Verifica que quien pide un reporte a nivel de institución completa (listado
// de promovidos de todo el año) sea personal directivo, no un docente cualquiera.
const puedeVerReporteInstitucional = (req, institucionId) => {
  const { tipoPerfil, institucionId: institucionUsuario } = req.usuario;
  return ['admin', 'rector', 'coordinador'].includes(tipoPerfil)
    && String(institucionUsuario) === String(institucionId);
};

// Trae y valida un grupo + su año académico + institución, verificando permisos.
// Devuelve { grupo, anioAcademico, institucion } o null (respuesta ya enviada).
const resolverGrupoAutorizado = async (req, res, grupoId) => {
  const grupo = await Grupo.findById(grupoId).populate('anioAcademicoId');

  if (!grupo) {
    res.status(404).json({ mensaje: 'Grupo no encontrado' });
    return null;
  }

  if (!puedeVerReporteGrupo(req, grupo)) {
    res.status(403).json({ mensaje: 'No tienes permisos para ver reportes de este grupo' });
    return null;
  }

  const institucion = await Institucion.findById(grupo.institucionId)
    .select('nombre nit direccion dane imagenes configuracion rectorId');

  return { grupo, anioAcademico: grupo.anioAcademicoId, institucion };
};

// Trae y valida la matrícula + institución para un matriculaId, verificando permisos.
// Devuelve { matricula, institucion } o null y ya deja la respuesta enviada si falla.
const resolverMatriculaAutorizada = async (req, res, matriculaId, populateEstudiante = 'nombres apellidos documento tipoDocumento foto genero tipoSangre') => {
  const matricula = await Matricula.findById(matriculaId)
    .populate('estudianteId', populateEstudiante)
    .populate('grupoId', 'nombre grado jornada')
    .populate('anioAcademicoId');

  if (!matricula) {
    res.status(404).json({ mensaje: 'Matrícula no encontrada' });
    return null;
  }

  const autorizado = await puedeVerReporteEstudiante(req, matricula);
  if (!autorizado) {
    res.status(403).json({ mensaje: 'No tienes permisos para ver este reporte' });
    return null;
  }

  const institucion = await Institucion.findById(matricula.institucionId)
    .select('nombre nit direccion dane imagenes configuracion rectorId secretariaId')
    .populate('rectorId', 'nombres apellidos');

  return { matricula, institucion };
};

// Arma el objeto "institucion" común que reciben los servicios de PDF,
// agregando el nombre del rector ya resuelto (evita repetir esto en cada endpoint).
const institucionParaPDF = (institucion) => ({
  ...(institucion?.toObject() || {}),
  rectorNombre: institucion?.rectorId
    ? `${institucion.rectorId.nombres} ${institucion.rectorId.apellidos}`
    : null
});

// GET /api/reportes/boletin/:matriculaId/:periodo
const generarBoletinPeriodo = async (req, res) => {
  try {
    const periodo = parseInt(req.params.periodo, 10);
    if (!periodo || periodo < 1 || periodo > 5) {
      return res.status(400).json({ mensaje: 'El período debe ser un número entre 1 y 5' });
    }

    const resuelto = await resolverMatriculaAutorizada(req, res, req.params.matriculaId);
    if (!resuelto) return;
    const { matricula, institucion } = resuelto;

    const periodoInfo = matricula.anioAcademicoId.cronograma?.periodos?.find((p) => p.numero === periodo) || {
      numero: periodo
    };

    const calificaciones = await Calificacion.find({
      estudianteId: matricula.estudianteId._id,
      anioAcademicoId: matricula.anioAcademicoId._id,
      periodo
    }).populate({
      path: 'asignaturaId',
      select: 'nombre orden areaId',
      populate: { path: 'areaId', select: 'nombre orden' }
    });

    if (calificaciones.length === 0) {
      return res.status(404).json({ mensaje: 'No hay calificaciones registradas para este estudiante en ese período' });
    }

    // Agrupar por área, respetando el orden configurado en Área y Asignatura
    const areasMap = new Map();
    calificaciones.forEach((cal) => {
      const asignatura = cal.asignaturaId;
      const area = asignatura?.areaId;
      const areaKey = area ? String(area._id) : 'sin-area';
      const areaNombre = area ? area.nombre : 'Sin área asignada';

      if (!areasMap.has(areaKey)) {
        areasMap.set(areaKey, { nombre: areaNombre, orden: area?.orden ?? 999, asignaturas: [] });
      }

      areasMap.get(areaKey).asignaturas.push({
        nombre: asignatura ? asignatura.nombre : 'Asignatura eliminada',
        orden: asignatura?.orden ?? 0,
        nota: cal.nota,
        observacion: cal.observacion
      });
    });

    const areas = Array.from(areasMap.values())
      .sort((a, b) => a.orden - b.orden)
      .map((area) => ({
        ...area,
        asignaturas: area.asignaturas.sort((a, b) => a.orden - b.orden)
      }));

    const notasValidas = calificaciones.map((c) => c.nota).filter((n) => typeof n === 'number');
    const promedioGeneral = notasValidas.length
      ? notasValidas.reduce((suma, n) => suma + n, 0) / notasValidas.length
      : null;

    generarBoletinPeriodoPDF(res, {
      institucion: institucion || {},
      anioAcademico: matricula.anioAcademicoId,
      periodoInfo,
      grupo: matricula.grupoId || {},
      estudiante: {
        nombreCompleto: `${matricula.estudianteId.nombres} ${matricula.estudianteId.apellidos}`,
        documento: matricula.estudianteId.documento,
        tipoDocumento: matricula.estudianteId.tipoDocumento
      },
      areas,
      promedioGeneral
    });
  } catch (error) {
    // El PDF puede empezar a transmitirse antes de un error tardío; si ya se enviaron
    // encabezados no se puede mandar JSON, así que solo se cierra la conexión.
    if (res.headersSent) {
      return res.end();
    }
    res.status(500).json({ mensaje: 'Error al generar el boletín', error: error.message });
  }
};

// GET /api/reportes/constancia/:matriculaId
// Formato 1: constancia simple de estudio (solo confirma matrícula activa).
const generarConstanciaEstudio = async (req, res) => {
  try {
    const resuelto = await resolverMatriculaAutorizada(req, res, req.params.matriculaId);
    if (!resuelto) return;
    const { matricula, institucion } = resuelto;

    if (matricula.estado !== 'activa') {
      return res.status(400).json({
        mensaje: `No se puede expedir constancia de estudio: la matrícula está en estado "${matricula.estado}"`
      });
    }

    generarConstanciaEstudioPDF(res, {
      institucion: institucionParaPDF(institucion),
      estudiante: {
        nombreCompleto: `${matricula.estudianteId.nombres} ${matricula.estudianteId.apellidos}`,
        documento: matricula.estudianteId.documento,
        tipoDocumento: matricula.estudianteId.tipoDocumento,
        genero: matricula.estudianteId.genero
      },
      matricula: {
        grupo: matricula.grupoId,
        anio: matricula.anioAcademicoId.anio,
        jornada: matricula.grupoId?.jornada
      },
      destinatario: req.query.destinatario || null,
      observaciones: req.query.observaciones || null
    });
  } catch (error) {
    if (res.headersSent) return res.end();
    res.status(500).json({ mensaje: 'Error al generar la constancia de estudio', error: error.message });
  }
};

// Trae todas las calificaciones del año académico de una matrícula y calcula
// el consolidado (reutilizado por certificado de notas y constancia con notas).
const obtenerConsolidadoAnioMatricula = async (matricula, institucion) => {
  const anioAcademico = matricula.anioAcademicoId;

  const calificaciones = await Calificacion.find({
    estudianteId: matricula.estudianteId._id,
    anioAcademicoId: anioAcademico._id
  }).populate({
    path: 'asignaturaId',
    select: 'nombre orden areaId',
    populate: { path: 'areaId', select: 'nombre orden' }
  });

  if (calificaciones.length === 0) return null;

  const configuracion = institucion?.configuracion || anioAcademico.configuracion;
  return calcularConsolidadoAnio(calificaciones, configuracion);
};

// GET /api/reportes/certificado-notas/:matriculaId
const generarCertificadoNotas = async (req, res) => {
  try {
    const resuelto = await resolverMatriculaAutorizada(req, res, req.params.matriculaId);
    if (!resuelto) return;
    const { matricula, institucion } = resuelto;

    const anioAcademico = matricula.anioAcademicoId;
    const periodos = (anioAcademico.cronograma?.periodos || [])
      .slice()
      .sort((a, b) => a.numero - b.numero)
      .map((p) => ({ numero: p.numero, nombre: p.nombre }));

    const consolidado = await obtenerConsolidadoAnioMatricula(matricula, institucion);
    if (!consolidado) {
      return res.status(404).json({ mensaje: 'No hay calificaciones registradas para este estudiante en este año académico' });
    }

    generarCertificadoNotasPDF(res, {
      institucion: institucionParaPDF(institucion),
      anioAcademico: { anio: anioAcademico.anio },
      estudiante: {
        nombreCompleto: `${matricula.estudianteId.nombres} ${matricula.estudianteId.apellidos}`,
        documento: matricula.estudianteId.documento,
        tipoDocumento: matricula.estudianteId.tipoDocumento
      },
      grupo: matricula.grupoId || {},
      periodos: periodos.length ? periodos : [{ numero: 1, nombre: 'Período 1' }],
      filas: consolidado.filas,
      promedioGeneral: consolidado.promedioGeneral,
      resultado: consolidado.resultado
    });
  } catch (error) {
    if (res.headersSent) return res.end();
    res.status(500).json({ mensaje: 'Error al generar el certificado de notas', error: error.message });
  }
};

// GET /api/reportes/constancia-notas/:matriculaId
// Formato 2: constancia de estudio que incluye el resumen de notas por área
// y el resultado final del año (para trámites que exigen evidencia de rendimiento).
const generarConstanciaNotas = async (req, res) => {
  try {
    const resuelto = await resolverMatriculaAutorizada(req, res, req.params.matriculaId);
    if (!resuelto) return;
    const { matricula, institucion } = resuelto;

    const consolidado = await obtenerConsolidadoAnioMatricula(matricula, institucion);
    if (!consolidado) {
      return res.status(404).json({ mensaje: 'No hay calificaciones registradas para este estudiante en este año académico' });
    }

    generarConstanciaNotasPDF(res, {
      institucion: institucionParaPDF(institucion),
      estudiante: {
        nombreCompleto: `${matricula.estudianteId.nombres} ${matricula.estudianteId.apellidos}`,
        documento: matricula.estudianteId.documento,
        tipoDocumento: matricula.estudianteId.tipoDocumento
      },
      matricula: {
        grupo: matricula.grupoId,
        anio: matricula.anioAcademicoId.anio
      },
      destinatario: req.query.destinatario || null,
      observaciones: req.query.observaciones || null,
      resumenAreas: consolidado.resumenAreas,
      promedioGeneral: consolidado.promedioGeneral,
      resultado: consolidado.resultado
    });
  } catch (error) {
    if (res.headersSent) return res.end();
    res.status(500).json({ mensaje: 'Error al generar la constancia con notas', error: error.message });
  }
};

// GET /api/reportes/carnet/estudiante/:matriculaId
const generarCarnetEstudiante = async (req, res) => {
  try {
    const resuelto = await resolverMatriculaAutorizada(req, res, req.params.matriculaId);
    if (!resuelto) return;
    const { matricula, institucion } = resuelto;

    const grupo = matricula.grupoId || {};
    const lineasDatos = [
      `Grado: ${grupo.grado ?? '-'}   Grupo: ${grupo.nombre || '-'}`,
      `Año lectivo: ${matricula.anioAcademicoId.anio}`
    ];
    if (matricula.numeroMatricula) lineasDatos.push(`Matrícula: ${matricula.numeroMatricula}`);

    generarCarnetPDF(res, {
      institucion: institucion?.toObject() || {},
      anio: matricula.anioAcademicoId.anio,
      etiquetaRol: ETIQUETAS_ROL.estudiante,
      persona: {
        nombreCompleto: `${matricula.estudianteId.nombres} ${matricula.estudianteId.apellidos}`,
        documento: matricula.estudianteId.documento,
        tipoDocumento: matricula.estudianteId.tipoDocumento,
        foto: matricula.estudianteId.foto,
        tipoSangre: matricula.estudianteId.tipoSangre
      },
      lineasDatos
    });
  } catch (error) {
    if (res.headersSent) return res.end();
    res.status(500).json({ mensaje: 'Error al generar el carnet', error: error.message });
  }
};

// GET /api/reportes/carnet/personal/:usuarioId
// Carnet para docentes, administrativos, rector o coordinador (no aplica a
// estudiantes, acudientes ni dirNucleo).
const generarCarnetPersonal = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.usuarioId).select(
      'nombres apellidos documento tipoDocumento foto institucionId tipoPerfil'
    );

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    if (!ETIQUETAS_ROL[usuario.tipoPerfil] || usuario.tipoPerfil === 'estudiante') {
      return res.status(400).json({
        mensaje: 'Este endpoint es solo para docentes, administrativos, rector o coordinador. Usa /carnet/estudiante/:matriculaId para estudiantes.'
      });
    }

    if (!puedeVerCarnetPersonal(req, usuario)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para ver este carnet' });
    }

    const institucion = await Institucion.findById(usuario.institucionId)
      .select('nombre nit direccion dane imagenes rectorId');

    if (!institucion) {
      return res.status(404).json({ mensaje: 'Institución del usuario no encontrada' });
    }

    const anioActual = new Date().getFullYear();

    generarCarnetPDF(res, {
      institucion: institucion.toObject(),
      anio: anioActual,
      etiquetaRol: ETIQUETAS_ROL[usuario.tipoPerfil],
      persona: {
        nombreCompleto: `${usuario.nombres} ${usuario.apellidos}`,
        documento: usuario.documento,
        tipoDocumento: usuario.tipoDocumento,
        foto: usuario.foto
      },
      lineasDatos: [
        `Cargo: ${ETIQUETAS_ROL[usuario.tipoPerfil]}`,
        institucion.nombre || ''
      ]
    });
  } catch (error) {
    if (res.headersSent) return res.end();
    res.status(500).json({ mensaje: 'Error al generar el carnet', error: error.message });
  }
};

// Agrupa un arreglo de Calificacion por estudianteId (string) -> [Calificacion...]
const agruparPorEstudiante = (calificaciones) => {
  const mapa = new Map();
  calificaciones.forEach((cal) => {
    const key = String(cal.estudianteId);
    if (!mapa.has(key)) mapa.set(key, []);
    mapa.get(key).push(cal);
  });
  return mapa;
};

// GET /api/reportes/estadisticas/:tipo
// Por ahora soporta tipo = "grupo" (estadísticas de un grupo, opcionalmente
// filtradas a un período con ?periodo=N; sin ese query, es el acumulado del año).
// Requiere ?grupoId= como query param.
const generarEstadisticas = async (req, res) => {
  try {
    if (req.params.tipo !== 'grupo') {
      return res.status(400).json({
        mensaje: 'Por ahora solo está disponible el tipo "grupo". Usa /api/reportes/estadisticas/grupo?grupoId=...'
      });
    }
    if (!req.query.grupoId) {
      return res.status(400).json({ mensaje: 'Falta el parámetro grupoId' });
    }

    const resuelto = await resolverGrupoAutorizado(req, res, req.query.grupoId);
    if (!resuelto) return;
    const { grupo, anioAcademico, institucion } = resuelto;

    const periodo = req.query.periodo ? parseInt(req.query.periodo, 10) : null;
    const notaMinima = institucion?.configuracion?.notaMinima ?? 3.0;

    const filtro = { grupoId: grupo._id, anioAcademicoId: anioAcademico._id };
    if (periodo) filtro.periodo = periodo;

    const calificaciones = await Calificacion.find(filtro).populate({
      path: 'asignaturaId',
      select: 'nombre orden areaId',
      populate: { path: 'areaId', select: 'nombre orden' }
    });

    if (calificaciones.length === 0) {
      return res.status(404).json({ mensaje: 'No hay calificaciones registradas para este grupo con esos filtros' });
    }

    let filasAreas;
    let estudiantesConPromedio;

    if (periodo) {
      // Vista de un período específico: promedio directo por área con las notas crudas.
      const areasMap = new Map();
      calificaciones.forEach((cal) => {
        const area = cal.asignaturaId?.areaId;
        const key = area ? String(area._id) : 'sin-area';
        if (!areasMap.has(key)) {
          areasMap.set(key, { nombre: area ? area.nombre : 'Sin área', orden: area?.orden ?? 999, notas: [] });
        }
        if (typeof cal.nota === 'number') areasMap.get(key).notas.push(cal.nota);
      });
      filasAreas = Array.from(areasMap.values()).sort((a, b) => a.orden - b.orden).map((a) => ({
        nombre: a.nombre,
        promedio: a.notas.length ? a.notas.reduce((s, n) => s + n, 0) / a.notas.length : null,
        aprobados: a.notas.filter((n) => n >= notaMinima).length,
        reprobados: a.notas.filter((n) => n < notaMinima).length,
        total: a.notas.length
      }));

      const porEstudiante = agruparPorEstudiante(calificaciones);
      estudiantesConPromedio = [];
      for (const [, notasEst] of porEstudiante) {
        const notas = notasEst.map((c) => c.nota).filter((n) => typeof n === 'number');
        if (notas.length) estudiantesConPromedio.push({ notasEst, promedio: notas.reduce((s, n) => s + n, 0) / notas.length });
      }
    } else {
      // Vista acumulada del año: usa el consolidado por estudiante (con recuperación/habilitación aplicada).
      const configuracion = institucion?.configuracion || anioAcademico.configuracion;
      const porEstudiante = agruparPorEstudiante(calificaciones);
      const consolidados = [];
      for (const [estudianteId, notasEst] of porEstudiante) {
        consolidados.push({ estudianteId, consolidado: calcularConsolidadoAnio(notasEst, configuracion) });
      }

      const areasMap = new Map();
      consolidados.forEach(({ consolidado }) => {
        consolidado.resumenAreas.forEach((area) => {
          if (!areasMap.has(area.nombre)) areasMap.set(area.nombre, { nombre: area.nombre, valores: [] });
          if (area.definitiva != null) areasMap.get(area.nombre).valores.push(area.definitiva);
        });
      });
      filasAreas = Array.from(areasMap.values()).map((a) => ({
        nombre: a.nombre,
        promedio: a.valores.length ? a.valores.reduce((s, n) => s + n, 0) / a.valores.length : null,
        aprobados: a.valores.filter((n) => n >= notaMinima).length,
        reprobados: a.valores.filter((n) => n < notaMinima).length,
        total: a.valores.length
      }));

      estudiantesConPromedio = consolidados
        .filter((c) => c.consolidado.promedioGeneral != null)
        .map((c) => ({ estudianteId: c.estudianteId, promedio: c.consolidado.promedioGeneral }));
    }

    // Traer nombres de los estudiantes para mejor/peor promedio
    const matriculas = await Matricula.find({ grupoId: grupo._id, estado: 'activa' }).populate('estudianteId', 'nombres apellidos');
    const nombresPorEstudiante = new Map(matriculas.map((m) => [String(m.estudianteId._id), `${m.estudianteId.nombres} ${m.estudianteId.apellidos}`]));

    let mejor = null;
    let peor = null;
    const listaConNombre = (periodo
      ? Array.from(agruparPorEstudiante(calificaciones).entries()).map(([estudianteId, notasEst]) => {
        const notas = notasEst.map((c) => c.nota).filter((n) => typeof n === 'number');
        return notas.length ? { estudianteId, promedio: notas.reduce((s, n) => s + n, 0) / notas.length } : null;
      }).filter(Boolean)
      : estudiantesConPromedio
    ).map((e) => ({ ...e, nombreCompleto: nombresPorEstudiante.get(String(e.estudianteId)) || 'Estudiante' }));

    listaConNombre.forEach((e) => {
      if (!mejor || e.promedio > mejor.promedio) mejor = e;
      if (!peor || e.promedio < peor.promedio) peor = e;
    });

    const promedioGrupal = filasAreas.length
      ? filasAreas.filter((a) => a.promedio != null).reduce((s, a) => s + a.promedio, 0) / filasAreas.filter((a) => a.promedio != null).length
      : null;

    generarEstadisticasGrupoPDF(res, {
      institucion: institucionParaPDF(institucion),
      grupo,
      anioAcademico: { anio: anioAcademico.anio },
      periodoLabel: periodo ? `Período ${periodo}` : 'Acumulado del año',
      filasAreas,
      promedioGrupal,
      mejor,
      peor
    });
  } catch (error) {
    if (res.headersSent) return res.end();
    res.status(500).json({ mensaje: 'Error al generar las estadísticas', error: error.message });
  }
};

// GET /api/reportes/evolucion/:grupoId
// Promedio grupal (crudo, sin recuperación) de cada período transcurrido del año.
const generarEvolucionGrupo = async (req, res) => {
  try {
    const resuelto = await resolverGrupoAutorizado(req, res, req.params.grupoId);
    if (!resuelto) return;
    const { grupo, anioAcademico, institucion } = resuelto;
    const notaMinima = institucion?.configuracion?.notaMinima ?? 3.0;

    const calificaciones = await Calificacion.find({ grupoId: grupo._id, anioAcademicoId: anioAcademico._id });

    if (calificaciones.length === 0) {
      return res.status(404).json({ mensaje: 'No hay calificaciones registradas para este grupo' });
    }

    const periodosDefinidos = (anioAcademico.cronograma?.periodos || []).slice().sort((a, b) => a.numero - b.numero);
    const numerosConDatos = [...new Set(calificaciones.map((c) => c.periodo))].sort((a, b) => a - b);

    const periodos = numerosConDatos.map((numero) => {
      const info = periodosDefinidos.find((p) => p.numero === numero);
      const notasPeriodo = calificaciones.filter((c) => c.periodo === numero);

      // Promedio por estudiante en ese período, y luego promedio de esos promedios (más representativo que promediar notas sueltas).
      const porEstudiante = agruparPorEstudiante(notasPeriodo);
      const promediosEstudiantes = [];
      for (const [, notasEst] of porEstudiante) {
        const notas = notasEst.map((c) => c.nota).filter((n) => typeof n === 'number');
        if (notas.length) promediosEstudiantes.push(notas.reduce((s, n) => s + n, 0) / notas.length);
      }

      return {
        numero,
        nombre: info?.nombre || `Período ${numero}`,
        promedio: promediosEstudiantes.length ? promediosEstudiantes.reduce((s, n) => s + n, 0) / promediosEstudiantes.length : null,
        aprobados: promediosEstudiantes.filter((n) => n >= notaMinima).length,
        reprobados: promediosEstudiantes.filter((n) => n < notaMinima).length,
        total: promediosEstudiantes.length
      };
    });

    generarEvolucionGrupoPDF(res, {
      institucion: institucionParaPDF(institucion),
      grupo,
      anioAcademico: { anio: anioAcademico.anio },
      periodos
    });
  } catch (error) {
    if (res.headersSent) return res.end();
    res.status(500).json({ mensaje: 'Error al generar la evolución del grupo', error: error.message });
  }
};

// GET /api/reportes/acumulativo/:grupoId
// Promedio de cada estudiante por período (crudo) + acumulado del año (con recuperación/habilitación aplicada).
const generarAcumulativoGrupo = async (req, res) => {
  try {
    const resuelto = await resolverGrupoAutorizado(req, res, req.params.grupoId);
    if (!resuelto) return;
    const { grupo, anioAcademico, institucion } = resuelto;

    const [calificaciones, matriculas] = await Promise.all([
      Calificacion.find({ grupoId: grupo._id, anioAcademicoId: anioAcademico._id }).populate({
        path: 'asignaturaId',
        select: 'nombre orden areaId',
        populate: { path: 'areaId', select: 'nombre orden' }
      }),
      Matricula.find({ grupoId: grupo._id, estado: 'activa' }).populate('estudianteId', 'nombres apellidos documento')
    ]);

    if (calificaciones.length === 0) {
      return res.status(404).json({ mensaje: 'No hay calificaciones registradas para este grupo' });
    }

    const periodosDefinidos = (anioAcademico.cronograma?.periodos || []).slice().sort((a, b) => a.numero - b.numero);
    const numerosConDatos = [...new Set(calificaciones.map((c) => c.periodo))].sort((a, b) => a - b);
    const periodos = numerosConDatos.map((numero) => ({
      numero,
      nombre: periodosDefinidos.find((p) => p.numero === numero)?.nombre || `Período ${numero}`
    }));

    const configuracion = institucion?.configuracion || anioAcademico.configuracion;
    const porEstudiante = agruparPorEstudiante(calificaciones);

    const filasEstudiantes = matriculas.map((mat) => {
      const notasEst = porEstudiante.get(String(mat.estudianteId._id)) || [];

      const promediosPorPeriodo = {};
      periodos.forEach(({ numero }) => {
        const notas = notasEst.filter((c) => c.periodo === numero).map((c) => c.nota).filter((n) => typeof n === 'number');
        promediosPorPeriodo[numero] = notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null;
      });

      const consolidado = notasEst.length ? calcularConsolidadoAnio(notasEst, configuracion) : null;

      return {
        nombreCompleto: `${mat.estudianteId.nombres} ${mat.estudianteId.apellidos}`,
        documento: mat.estudianteId.documento,
        promediosPorPeriodo,
        acumulado: consolidado?.promedioGeneral ?? null
      };
    });

    generarAcumulativoGrupoPDF(res, {
      institucion: institucionParaPDF(institucion),
      grupo,
      anioAcademico: { anio: anioAcademico.anio },
      periodos,
      filasEstudiantes
    });
  } catch (error) {
    if (res.headersSent) return res.end();
    res.status(500).json({ mensaje: 'Error al generar el informe acumulativo', error: error.message });
  }
};

// GET /api/reportes/observador/:estudianteId
// Permisos: mismos que para reportes de un estudiante individual, pero
// resueltos directamente sobre el Usuario (el observador no depende de una matrícula puntual).
const generarObservadorEstudiante = async (req, res) => {
  try {
    const estudiante = await Usuario.findById(req.params.estudianteId)
      .select('nombres apellidos documento tipoDocumento institucionId tipoPerfil');

    if (!estudiante || estudiante.tipoPerfil !== 'estudiante') {
      return res.status(404).json({ mensaje: 'Estudiante no encontrado' });
    }

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
      return res.status(403).json({ mensaje: 'No tienes permisos para ver el observador de este estudiante' });
    }

    const filtro = { estudianteId: estudiante._id };
    if (req.query.anioAcademicoId) filtro.anioAcademicoId = req.query.anioAcademicoId;

    const registros = await Observador.find(filtro)
      .sort({ fecha: -1 })
      .populate('docenteId', 'nombres apellidos')
      .populate('seguimiento.responsable', 'nombres apellidos');

    const institucion = await Institucion.findById(estudiante.institucionId).select('nombre nit dane');

    // Grupo actual (matrícula activa más reciente), solo informativo en el encabezado.
    const matriculaActiva = await Matricula.findOne({ estudianteId: estudiante._id, estado: 'activa' })
      .sort({ fechaMatricula: -1 })
      .populate('grupoId', 'nombre grado');

    generarObservadorPDF(res, {
      institucion: institucion?.toObject() || {},
      estudiante: {
        nombreCompleto: `${estudiante.nombres} ${estudiante.apellidos}`,
        documento: estudiante.documento,
        tipoDocumento: estudiante.tipoDocumento
      },
      grupo: matriculaActiva?.grupoId || null,
      registros: registros.map((r) => ({
        tipo: r.tipo,
        categoria: r.categoria,
        gravedad: r.gravedad,
        estado: r.estado,
        fecha: r.fecha,
        descripcion: r.descripcion,
        compromiso: r.compromiso,
        docenteNombre: r.docenteId ? `${r.docenteId.nombres} ${r.docenteId.apellidos}` : null,
        seguimiento: (r.seguimiento || []).map((s) => ({
          fecha: s.fecha,
          observacion: s.observacion,
          responsableNombre: s.responsable ? `${s.responsable.nombres} ${s.responsable.apellidos}` : null
        }))
      }))
    });
  } catch (error) {
    if (res.headersSent) return res.end();
    res.status(500).json({ mensaje: 'Error al generar el informe de observador', error: error.message });
  }
};

// GET /api/reportes/libro-final/:grupoId
const generarLibroFinalGrupo = async (req, res) => {
  try {
    const resuelto = await resolverGrupoAutorizado(req, res, req.params.grupoId);
    if (!resuelto) return;
    const { grupo, anioAcademico, institucion } = resuelto;

    const [calificaciones, matriculas] = await Promise.all([
      Calificacion.find({ grupoId: grupo._id, anioAcademicoId: anioAcademico._id }).populate({
        path: 'asignaturaId',
        select: 'nombre orden areaId',
        populate: { path: 'areaId', select: 'nombre orden' }
      }),
      Matricula.find({ grupoId: grupo._id, estado: 'activa' }).populate('estudianteId', 'nombres apellidos documento')
    ]);

    if (calificaciones.length === 0) {
      return res.status(404).json({ mensaje: 'No hay calificaciones registradas para este grupo' });
    }

    const configuracion = institucion?.configuracion || anioAcademico.configuracion;
    const porEstudiante = agruparPorEstudiante(calificaciones);

    // Columnas = unión de todas las asignaturas vistas en el grupo, en orden.
    const asignaturasMap = new Map();
    calificaciones.forEach((cal) => {
      const asig = cal.asignaturaId;
      const key = asig ? String(asig._id) : `sin-asignatura`;
      if (!asignaturasMap.has(key)) {
        asignaturasMap.set(key, { id: key, nombre: asig ? asig.nombre : 'Asignatura eliminada', orden: asig?.orden ?? 0, areaOrden: asig?.areaId?.orden ?? 999 });
      }
    });
    const asignaturas = Array.from(asignaturasMap.values()).sort((a, b) => a.areaOrden - b.areaOrden || a.orden - b.orden);

    const filasEstudiantes = matriculas.map((mat) => {
      const notasEst = porEstudiante.get(String(mat.estudianteId._id)) || [];
      const consolidado = notasEst.length ? calcularConsolidadoAnio(notasEst, configuracion) : null;

      const notasPorAsignatura = {};
      (consolidado?.filas || []).forEach((f) => { notasPorAsignatura[f.asignaturaId] = f.definitiva; });

      return {
        nombreCompleto: `${mat.estudianteId.nombres} ${mat.estudianteId.apellidos}`,
        documento: mat.estudianteId.documento,
        notasPorAsignatura,
        promedioGeneral: consolidado?.promedioGeneral ?? null,
        resultado: consolidado?.resultado ?? 'Pendiente'
      };
    }).sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));

    generarLibroFinalPDF(res, {
      institucion: institucionParaPDF(institucion),
      grupo,
      anioAcademico: { anio: anioAcademico.anio },
      asignaturas,
      filasEstudiantes
    });
  } catch (error) {
    if (res.headersSent) return res.end();
    res.status(500).json({ mensaje: 'Error al generar el libro final', error: error.message });
  }
};

// GET /api/reportes/promovidos/:anioId
// Requiere personal directivo (admin/rector/coordinador). Opcional: ?grupoId= para filtrar a un solo grupo.
const generarListadoPromovidos = async (req, res) => {
  try {
    const anioAcademico = await AnioAcademico.findById(req.params.anioId);
    if (!anioAcademico) {
      return res.status(404).json({ mensaje: 'Año académico no encontrado' });
    }

    if (!puedeVerReporteInstitucional(req, anioAcademico.institucionId)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para ver el listado de promoción de esta institución' });
    }

    const institucion = await Institucion.findById(anioAcademico.institucionId).select('nombre nit dane configuracion');

    const filtroMatricula = { anioAcademicoId: anioAcademico._id, estado: 'activa' };
    if (req.query.grupoId) filtroMatricula.grupoId = req.query.grupoId;

    const matriculas = await Matricula.find(filtroMatricula)
      .populate('estudianteId', 'nombres apellidos documento')
      .populate('grupoId', 'nombre');

    if (matriculas.length === 0) {
      return res.status(404).json({ mensaje: 'No hay matrículas activas para este año académico con esos filtros' });
    }

    const estudianteIds = matriculas.map((m) => m.estudianteId._id);
    const calificaciones = await Calificacion.find({
      anioAcademicoId: anioAcademico._id,
      estudianteId: { $in: estudianteIds }
    }).populate({
      path: 'asignaturaId',
      select: 'nombre orden areaId',
      populate: { path: 'areaId', select: 'nombre orden' }
    });

    const configuracion = institucion?.configuracion || anioAcademico.configuracion;
    const porEstudiante = agruparPorEstudiante(calificaciones);

    const promovidos = [];
    const noPromovidos = [];
    const pendientes = [];

    matriculas.forEach((mat) => {
      const notasEst = porEstudiante.get(String(mat.estudianteId._id)) || [];
      const nombreCompleto = `${mat.estudianteId.nombres} ${mat.estudianteId.apellidos}`;
      const base = { nombreCompleto, documento: mat.estudianteId.documento, grupo: mat.grupoId?.nombre };

      if (notasEst.length === 0) {
        pendientes.push(base);
        return;
      }

      const consolidado = calcularConsolidadoAnio(notasEst, configuracion);
      const conPromedio = { ...base, promedio: consolidado.promedioGeneral };

      if (consolidado.resultado === 'Aprobó') promovidos.push(conPromedio);
      else if (consolidado.resultado === 'Reprobó') noPromovidos.push(conPromedio);
      else pendientes.push(base);
    });

    const grupoLabel = req.query.grupoId && matriculas[0]?.grupoId ? `Grupo ${matriculas[0].grupoId.nombre}` : null;

    generarPromovidosPDF(res, {
      institucion: institucion?.toObject() || {},
      anioAcademico: { anio: anioAcademico.anio },
      grupoLabel,
      promovidos,
      noPromovidos,
      pendientes
    });
  } catch (error) {
    if (res.headersSent) return res.end();
    res.status(500).json({ mensaje: 'Error al generar el listado de promoción', error: error.message });
  }
};

// GET /api/reportes/fallas/:grupoId
// Áreas/asignaturas reprobadas por cada estudiante del grupo, hasta el momento del año.
const generarInformeFallas = async (req, res) => {
  try {
    const resuelto = await resolverGrupoAutorizado(req, res, req.params.grupoId);
    if (!resuelto) return;
    const { grupo, anioAcademico, institucion } = resuelto;
    const notaMinima = institucion?.configuracion?.notaMinima ?? 3.0;

    const [calificaciones, matriculas] = await Promise.all([
      Calificacion.find({ grupoId: grupo._id, anioAcademicoId: anioAcademico._id }).populate({
        path: 'asignaturaId',
        select: 'nombre orden areaId',
        populate: { path: 'areaId', select: 'nombre orden' }
      }),
      Matricula.find({ grupoId: grupo._id, estado: 'activa' }).populate('estudianteId', 'nombres apellidos documento')
    ]);

    if (calificaciones.length === 0) {
      return res.status(404).json({ mensaje: 'No hay calificaciones registradas para este grupo' });
    }

    const configuracion = institucion?.configuracion || anioAcademico.configuracion;
    const porEstudiante = agruparPorEstudiante(calificaciones);

    const filasEstudiantes = matriculas.map((mat) => {
      const notasEst = porEstudiante.get(String(mat.estudianteId._id)) || [];
      const consolidado = notasEst.length ? calcularConsolidadoAnio(notasEst, configuracion) : null;
      const areasReprobadas = (consolidado?.resumenAreas || []).filter((a) => a.definitiva != null && a.definitiva < notaMinima);

      return {
        nombreCompleto: `${mat.estudianteId.nombres} ${mat.estudianteId.apellidos}`,
        documento: mat.estudianteId.documento,
        areasReprobadas
      };
    }).sort((a, b) => b.areasReprobadas.length - a.areasReprobadas.length);

    generarFallasPDF(res, {
      institucion: institucionParaPDF(institucion),
      grupo,
      anioAcademico: { anio: anioAcademico.anio },
      notaMinima,
      filasEstudiantes
    });
  } catch (error) {
    if (res.headersSent) return res.end();
    res.status(500).json({ mensaje: 'Error al generar el informe de fallas', error: error.message });
  }
};

module.exports = {
  generarBoletinPeriodo,
  generarConstanciaEstudio,
  generarConstanciaNotas,
  generarCertificadoNotas,
  generarCarnetEstudiante,
  generarCarnetPersonal,
  generarEstadisticas,
  generarEvolucionGrupo,
  generarAcumulativoGrupo,
  generarObservadorEstudiante,
  generarLibroFinalGrupo,
  generarListadoPromovidos,
  generarInformeFallas
};