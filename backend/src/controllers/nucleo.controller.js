const Institucion = require('../models/Institucion');
const Usuario = require('../models/Usuario');
const Matricula = require('../models/Matricula');
const SolicitudRegistro = require('../models/SolicitudRegistro');

// --- Gestión de instituciones del núcleo -----------------------------------

// Lista los colegios del núcleo autenticado con KPIs básicos por colegio.
const listarInstituciones = async (req, res) => {
  try {
    const instituciones = await Institucion.find({ nucleoId: req.usuario.nucleoId });

    const conKpis = await Promise.all(
      instituciones.map(async (inst) => {
        const [totalUsuarios, totalDocentes, totalEstudiantes] = await Promise.all([
          Usuario.countDocuments({ institucionId: inst._id, estado: 'activo' }),
          Usuario.countDocuments({ institucionId: inst._id, tipoPerfil: 'docente', estado: 'activo' }),
          Usuario.countDocuments({ institucionId: inst._id, tipoPerfil: 'estudiante', estado: 'activo' })
        ]);

        return {
          institucion: inst,
          kpis: { totalUsuarios, totalDocentes, totalEstudiantes }
        };
      })
    );

    res.status(200).json(conKpis);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al listar instituciones del núcleo', error: error.message });
  }
};

// Crea una nueva institución asignada al núcleo autenticado.
const crearInstitucion = async (req, res) => {
  try {
    const institucion = new Institucion({ ...req.body, nucleoId: req.usuario.nucleoId });
    await institucion.save();
    res.status(201).json(institucion);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al crear la institución', error: error.message });
  }
};

// Crea el usuario administrador inicial de un colegio del núcleo.
const crearAdminInstitucion = async (req, res) => {
  try {
    const institucion = await Institucion.findOne({ _id: req.params.id, nucleoId: req.usuario.nucleoId });

    if (!institucion) {
      return res.status(404).json({ mensaje: 'Institución no encontrada en este núcleo' });
    }

    const admin = new Usuario({
      ...req.body,
      institucionId: institucion._id,
      tipoPerfil: 'admin'
    });
    await admin.save();

    const sinPassword = admin.toObject();
    delete sinPassword.credenciales;

    res.status(201).json(sinPassword);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al crear el administrador del colegio', error: error.message });
  }
};

// --- Auto-registro de colegios ----------------------------------------------

const listarSolicitudes = async (req, res) => {
  try {
    const { estado = 'pendiente' } = req.query;
    const solicitudes = await SolicitudRegistro.find({ nucleoId: req.usuario.nucleoId, estado });
    res.status(200).json(solicitudes);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al listar solicitudes', error: error.message });
  }
};

const aprobarSolicitud = async (req, res) => {
  try {
    const solicitud = await SolicitudRegistro.findOne({ _id: req.params.id, nucleoId: req.usuario.nucleoId });

    if (!solicitud) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    if (solicitud.estado !== 'pendiente') {
      return res.status(400).json({ mensaje: 'Esta solicitud ya fue procesada' });
    }

    const institucion = new Institucion({
      nombre: solicitud.nombre,
      nit: solicitud.nit,
      direccion: solicitud.direccion,
      email: solicitud.contacto.email,
      telefono: solicitud.contacto.telefono,
      nucleoId: solicitud.nucleoId
    });
    await institucion.save();

    solicitud.estado = 'aprobada';
    solicitud.procesadoPor = req.usuario.id;
    solicitud.observaciones = req.body.observaciones || solicitud.observaciones;
    await solicitud.save();

    res.status(200).json({ mensaje: 'Solicitud aprobada e institución creada', institucion, solicitud });
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al aprobar la solicitud', error: error.message });
  }
};

const rechazarSolicitud = async (req, res) => {
  try {
    const solicitud = await SolicitudRegistro.findOne({ _id: req.params.id, nucleoId: req.usuario.nucleoId });

    if (!solicitud) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    if (solicitud.estado !== 'pendiente') {
      return res.status(400).json({ mensaje: 'Esta solicitud ya fue procesada' });
    }

    solicitud.estado = 'rechazada';
    solicitud.procesadoPor = req.usuario.id;
    solicitud.observaciones = req.body.observaciones;
    await solicitud.save();

    res.status(200).json(solicitud);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al rechazar la solicitud', error: error.message });
  }
};

// --- Estadísticas (solo lectura, sin datos operativos internos) ------------

const estadisticasInstitucion = async (institucionId) => {
  const [totalEstudiantes, totalDocentes, matriculasActivas] = await Promise.all([
    Usuario.countDocuments({ institucionId, tipoPerfil: 'estudiante', estado: 'activo' }),
    Usuario.countDocuments({ institucionId, tipoPerfil: 'docente', estado: 'activo' }),
    Matricula.countDocuments({ institucionId, estado: 'activa' })
  ]);

  return { totalEstudiantes, totalDocentes, matriculasActivas };
};

const estadisticas = async (req, res) => {
  try {
    const instituciones = await Institucion.find({ nucleoId: req.usuario.nucleoId });

    const detalle = await Promise.all(
      instituciones.map(async (inst) => ({
        institucionId: inst._id,
        nombre: inst.nombre,
        ...(await estadisticasInstitucion(inst._id))
      }))
    );

    const totales = detalle.reduce(
      (acc, d) => ({
        totalEstudiantes: acc.totalEstudiantes + d.totalEstudiantes,
        totalDocentes: acc.totalDocentes + d.totalDocentes,
        matriculasActivas: acc.matriculasActivas + d.matriculasActivas
      }),
      { totalEstudiantes: 0, totalDocentes: 0, matriculasActivas: 0 }
    );

    res.status(200).json({ totales, porInstitucion: detalle });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener estadísticas del núcleo', error: error.message });
  }
};

const estadisticasPorInstitucion = async (req, res) => {
  try {
    const institucion = await Institucion.findOne({ _id: req.params.instId, nucleoId: req.usuario.nucleoId });

    if (!institucion) {
      return res.status(404).json({ mensaje: 'Institución no encontrada en este núcleo' });
    }

    const stats = await estadisticasInstitucion(institucion._id);
    res.status(200).json({ institucionId: institucion._id, nombre: institucion.nombre, ...stats });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener estadísticas de la institución', error: error.message });
  }
};

// Comparativo simple entre colegios del núcleo, reutilizando `estadisticas`.
const comparativo = async (req, res) => {
  try {
    const instituciones = await Institucion.find({ nucleoId: req.usuario.nucleoId });

    const comparativoData = await Promise.all(
      instituciones.map(async (inst) => ({
        institucionId: inst._id,
        nombre: inst.nombre,
        ...(await estadisticasInstitucion(inst._id))
      }))
    );

    res.status(200).json(comparativoData);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al generar el comparativo', error: error.message });
  }
};

// Reportes consolidados del núcleo. De momento soporta el tipo "resumen";
// otros tipos (ej. PDF) se implementarán junto al motor de reportes
// (ver PLAN_MIGRACION, FASE 5).
const reportes = async (req, res) => {
  const { tipo } = req.params;

  if (tipo !== 'resumen') {
    return res.status(400).json({ mensaje: `Tipo de reporte no soportado: ${tipo}` });
  }

  return estadisticas(req, res);
};

module.exports = {
  listarInstituciones,
  crearInstitucion,
  crearAdminInstitucion,
  listarSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
  estadisticas,
  estadisticasPorInstitucion,
  comparativo,
  reportes
};
