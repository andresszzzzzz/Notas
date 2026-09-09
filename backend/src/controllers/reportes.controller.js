const Matricula = require('../models/Matricula');
const Calificacion = require('../models/Calificacion');
const Institucion = require('../models/Institucion');
const Usuario = require('../models/Usuario');
const { generarBoletinPeriodoPDF } = require('../services/pdf/boletin.service');

// Verifica que quien pide el boletín tenga derecho a verlo:
// - admin/rector/coordinador/docente de la misma institución del estudiante
// - el propio estudiante
// - un acudiente que tenga a ese estudiante entre sus relaciones
const puedeVerBoletin = async (req, matricula) => {
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

// GET /api/reportes/boletin/:matriculaId/:periodo
const generarBoletinPeriodo = async (req, res) => {
  try {
    const periodo = parseInt(req.params.periodo, 10);
    if (!periodo || periodo < 1 || periodo > 5) {
      return res.status(400).json({ mensaje: 'El período debe ser un número entre 1 y 5' });
    }

    const matricula = await Matricula.findById(req.params.matriculaId)
      .populate('estudianteId', 'nombres apellidos documento tipoDocumento')
      .populate('grupoId', 'nombre grado')
      .populate('anioAcademicoId', 'anio cronograma');

    if (!matricula) {
      return res.status(404).json({ mensaje: 'Matrícula no encontrada' });
    }

    const autorizado = await puedeVerBoletin(req, matricula);
    if (!autorizado) {
      return res.status(403).json({ mensaje: 'No tienes permisos para ver este boletín' });
    }

    const institucion = await Institucion.findById(matricula.institucionId).select('nombre nit direccion dane');

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

module.exports = { generarBoletinPeriodo };
