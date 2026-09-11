const Usuario = require('../models/Usuario');
const Institucion = require('../models/Institucion');
const Matricula = require('../models/Matricula');
const AnioAcademico = require('../models/AnioAcademico');
const CargaAcademica = require('../models/CargaAcademica');
const Calificacion = require('../models/Calificacion');
const {
  generarConstanciaPDF,
  generarCertificadoPDF,
  generarCarnetPDF
} = require('../services/pdf/documentos');

// Estos documentos solo existen para estos 3 perfiles. Cualquier otro rol
// (acudiente, rector, coordinador, dirNucleo) recibe un 400 al pedirlos.
const ROLES_DOCUMENTOS = ['estudiante', 'docente', 'admin'];

// Roles que pueden generar el documento de CUALQUIER persona de su institución.
const ROLES_GESTORES = ['admin', 'rector', 'coordinador'];

// Busca al usuario destino y valida que su rol admita estos documentos.
const obtenerUsuarioDocumentable = async (usuarioId) => {
  const usuario = await Usuario.findById(usuarioId);
  if (!usuario) return { error: { status: 404, mensaje: 'Usuario no encontrado' } };

  if (!ROLES_DOCUMENTOS.includes(usuario.tipoPerfil)) {
    return {
      error: {
        status: 400,
        mensaje: 'Este documento solo puede generarse para estudiantes, docentes o administrativos'
      }
    };
  }

  return { usuario };
};

// El propio usuario puede generar su documento; o un admin/rector/coordinador
// de la misma institución puede generarlo para cualquier persona de su colegio.
const puedeGenerarPara = (req, usuarioDestino) => {
  if (String(req.usuario.id) === String(usuarioDestino._id)) return true;

  return (
    ROLES_GESTORES.includes(req.usuario.tipoPerfil) &&
    String(req.usuario.institucionId) === String(usuarioDestino.institucionId)
  );
};

// Trae la matrícula activa más reciente del estudiante (para constancia/certificado).
const obtenerMatriculaActiva = async (estudianteId, institucionId) => {
  return Matricula.findOne({ estudianteId, institucionId, estado: 'activa' })
    .sort({ createdAt: -1 })
    .populate('grupoId', 'nombre grado jornada')
    .populate('anioAcademicoId', 'anio');
};

// Arma el bloque "academico" (áreas + promedio) para el certificado de un estudiante.
const construirAcademicoCertificado = async (matricula) => {
  const calificaciones = await Calificacion.find({
    estudianteId: matricula.estudianteId,
    anioAcademicoId: matricula.anioAcademicoId._id
  }).populate({
    path: 'asignaturaId',
    select: 'nombre areaId',
    populate: { path: 'areaId', select: 'nombre orden' }
  });

  const areasMap = new Map();
  calificaciones.forEach((cal) => {
    if (typeof cal.nota !== 'number') return;
    const area = cal.asignaturaId?.areaId;
    const clave = area ? String(area._id) : 'sin-area';
    const nombre = area ? area.nombre : 'Sin área asignada';

    if (!areasMap.has(clave)) {
      areasMap.set(clave, { nombre, orden: area?.orden ?? 999, notas: [] });
    }
    areasMap.get(clave).notas.push(cal.nota);
  });

  const areas = Array.from(areasMap.values())
    .sort((a, b) => a.orden - b.orden)
    .map((area) => ({
      nombre: area.nombre,
      promedio: area.notas.reduce((suma, n) => suma + n, 0) / area.notas.length
    }));

  const todasLasNotas = calificaciones.map((c) => c.nota).filter((n) => typeof n === 'number');
  const promedioGeneral = todasLasNotas.length
    ? todasLasNotas.reduce((suma, n) => suma + n, 0) / todasLasNotas.length
    : null;

  return {
    grado: matricula.grupoId?.grado,
    grupoNombre: matricula.grupoId?.nombre,
    jornada: matricula.grupoId?.jornada,
    anio: matricula.anioAcademicoId?.anio,
    areas,
    promedioGeneral
  };
};

// Arma el bloque "laboral" (asignaturas a cargo) para el certificado de un docente.
const construirLaboralCertificado = async (usuario) => {
  const anioActivo = await AnioAcademico.findOne({ institucionId: usuario.institucionId, estado: 'activo' })
    .sort({ anio: -1 });

  let asignaturas = [];
  if (anioActivo) {
    const cargas = await CargaAcademica.find({
      institucionId: usuario.institucionId,
      anioAcademicoId: anioActivo._id,
      docenteId: usuario._id,
      estado: 'activo'
    })
      .populate('asignaturaId', 'nombre')
      .populate('grupoId', 'nombre');

    asignaturas = cargas.map((c) => ({
      nombre: c.asignaturaId?.nombre || 'Asignatura eliminada',
      grupo: c.grupoId?.nombre
    }));
  }

  return {
    cargo: 'Docente',
    fechaVinculacion: usuario.createdAt ? usuario.createdAt.toLocaleDateString('es-CO') : '-',
    asignaturas
  };
};

// GET /api/documentos/constancia/:usuarioId
const constancia = async (req, res) => {
  try {
    const { usuario, error } = await obtenerUsuarioDocumentable(req.params.usuarioId);
    if (error) return res.status(error.status).json({ mensaje: error.mensaje });

    if (!puedeGenerarPara(req, usuario)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para generar este documento' });
    }

    const institucion = await Institucion.findById(usuario.institucionId)
      .select('nombre nit dane direccion telefono imagenes');

    const persona = {
      nombreCompleto: usuario.nombreCompleto,
      tipoDocumento: usuario.tipoDocumento,
      documento: usuario.documento,
      rol: usuario.tipoPerfil
    };

    if (usuario.tipoPerfil === 'estudiante') {
      const matricula = await obtenerMatriculaActiva(usuario._id, usuario.institucionId);
      if (!matricula) {
        return res.status(404).json({ mensaje: 'El estudiante no tiene una matrícula activa' });
      }

      return generarConstanciaPDF(res, {
        institucion,
        persona,
        academico: {
          grado: matricula.grupoId?.grado,
          grupoNombre: matricula.grupoId?.nombre,
          jornada: matricula.grupoId?.jornada,
          anio: matricula.anioAcademicoId?.anio
        }
      });
    }

    // docente o admin
    return generarConstanciaPDF(res, {
      institucion,
      persona,
      laboral: {
        cargo: usuario.tipoPerfil === 'docente' ? 'Docente' : 'Personal Administrativo',
        fechaVinculacion: usuario.createdAt ? usuario.createdAt.toLocaleDateString('es-CO') : '-'
      }
    });
  } catch (error) {
    if (res.headersSent) return res.end();
    res.status(500).json({ mensaje: 'Error al generar la constancia', error: error.message });
  }
};

// GET /api/documentos/certificado/:usuarioId
const certificado = async (req, res) => {
  try {
    const { usuario, error } = await obtenerUsuarioDocumentable(req.params.usuarioId);
    if (error) return res.status(error.status).json({ mensaje: error.mensaje });

    if (!puedeGenerarPara(req, usuario)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para generar este documento' });
    }

    const institucion = await Institucion.findById(usuario.institucionId)
      .select('nombre nit dane direccion telefono imagenes');

    const persona = {
      nombreCompleto: usuario.nombreCompleto,
      tipoDocumento: usuario.tipoDocumento,
      documento: usuario.documento,
      rol: usuario.tipoPerfil
    };

    if (usuario.tipoPerfil === 'estudiante') {
      const matricula = await obtenerMatriculaActiva(usuario._id, usuario.institucionId);
      if (!matricula) {
        return res.status(404).json({ mensaje: 'El estudiante no tiene una matrícula activa' });
      }

      const academico = await construirAcademicoCertificado(matricula);
      return generarCertificadoPDF(res, { institucion, persona, academico });
    }

    // docente o admin
    const laboral = await construirLaboralCertificado(usuario);
    if (usuario.tipoPerfil === 'admin') laboral.cargo = 'Personal Administrativo';

    return generarCertificadoPDF(res, { institucion, persona, laboral });
  } catch (error) {
    if (res.headersSent) return res.end();
    res.status(500).json({ mensaje: 'Error al generar el certificado', error: error.message });
  }
};

// GET /api/documentos/carnet/:usuarioId
const carnet = async (req, res) => {
  try {
    const { usuario, error } = await obtenerUsuarioDocumentable(req.params.usuarioId);
    if (error) return res.status(error.status).json({ mensaje: error.mensaje });

    if (!puedeGenerarPara(req, usuario)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para generar este documento' });
    }

    const institucion = await Institucion.findById(usuario.institucionId)
      .select('nombre dane imagenes');

    let anio = new Date().getFullYear();
    let grado;
    let grupoNombre;
    let cargo;

    if (usuario.tipoPerfil === 'estudiante') {
      const matricula = await obtenerMatriculaActiva(usuario._id, usuario.institucionId);
      if (matricula) {
        grado = matricula.grupoId?.grado;
        grupoNombre = matricula.grupoId?.nombre;
        anio = matricula.anioAcademicoId?.anio || anio;
      }
    } else {
      cargo = usuario.tipoPerfil === 'docente' ? 'Docente' : 'Personal Administrativo';
      const anioActivo = await AnioAcademico.findOne({ institucionId: usuario.institucionId, estado: 'activo' });
      if (anioActivo) anio = anioActivo.anio;
    }

    generarCarnetPDF(res, {
      institucion,
      persona: {
        nombreCompleto: usuario.nombreCompleto,
        tipoDocumento: usuario.tipoDocumento,
        documento: usuario.documento,
        rol: usuario.tipoPerfil,
        foto: usuario.foto,
        grado,
        grupoNombre,
        cargo
      },
      anio
    });
  } catch (error) {
    if (res.headersSent) return res.end();
    res.status(500).json({ mensaje: 'Error al generar el carnet', error: error.message });
  }
};

module.exports = { constancia, certificado, carnet };