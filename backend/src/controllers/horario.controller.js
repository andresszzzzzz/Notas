const Horario = require('../models/Horario');
const Grupo = require('../models/Grupo');
const Asignatura = require('../models/Asignatura');
const Usuario = require('../models/Usuario');

// Convierte "HH:MM" a minutos desde medianoche, para poder comparar rangos.
const aMinutos = (horaTexto) => {
  const [horas, minutos] = horaTexto.split(':').map(Number);
  return horas * 60 + minutos;
};

// Dos rangos [ini1,fin1) y [ini2,fin2) se solapan si uno empieza antes de que
// el otro termine, en ambos sentidos.
const seSolapan = (ini1, fin1, ini2, fin2) => ini1 < fin2 && ini2 < fin1;

// Busca si el bloque que se quiere guardar choca con otro ya existente, para
// el mismo grupo (el grupo no puede tener dos clases a la vez) o para el
// mismo docente (el docente no puede estar en dos salones a la vez), el mismo
// día. excluirId se usa al actualizar, para no chocar contra sí mismo.
const buscarChoqueHorario = async ({ anioAcademicoId, grupoId, docenteId, diaSemana, horaInicio, horaFin, excluirId }) => {
  const filtroBase = { anioAcademicoId, diaSemana };
  if (excluirId) filtroBase._id = { $ne: excluirId };

  const candidatos = await Horario.find({
    ...filtroBase,
    $or: [{ grupoId }, { docenteId }]
  }).populate('asignaturaId', 'nombre').populate('grupoId', 'nombre').populate('docenteId', 'nombres apellidos');

  const nuevoIni = aMinutos(horaInicio);
  const nuevoFin = aMinutos(horaFin);

  for (const existente of candidatos) {
    if (!seSolapan(nuevoIni, nuevoFin, aMinutos(existente.horaInicio), aMinutos(existente.horaFin))) continue;

    if (String(existente.grupoId._id) === String(grupoId)) {
      return {
        tipo: 'grupo',
        mensaje: `El grupo ya tiene clase de ${existente.asignaturaId?.nombre || 'otra asignatura'} ese día de ${existente.horaInicio} a ${existente.horaFin}`
      };
    }
    if (String(existente.docenteId._id) === String(docenteId)) {
      return {
        tipo: 'docente',
        mensaje: `El docente ya tiene clase con el grupo ${existente.grupoId?.nombre || 'otro grupo'} ese día de ${existente.horaInicio} a ${existente.horaFin}`
      };
    }
  }

  return null;
};

// Valida que grupo, asignatura y docente existan y pertenezcan a la
// institución del usuario logueado.
const validarPertenencia = async (req, { grupoId, asignaturaId, docenteId }) => {
  const [grupo, asignatura, docente] = await Promise.all([
    Grupo.findById(grupoId),
    Asignatura.findById(asignaturaId),
    Usuario.findById(docenteId).select('institucionId tipoPerfil')
  ]);

  if (!grupo) return { ok: false, mensaje: 'Grupo no encontrado' };
  if (!asignatura) return { ok: false, mensaje: 'Asignatura no encontrada' };
  if (!docente || docente.tipoPerfil !== 'docente') return { ok: false, mensaje: 'Docente no encontrado' };

  const institucionId = req.usuario.institucionId;
  if (
    String(grupo.institucionId) !== String(institucionId)
    || String(asignatura.institucionId) !== String(institucionId)
    || String(docente.institucionId) !== String(institucionId)
  ) {
    return { ok: false, mensaje: 'El grupo, la asignatura o el docente no pertenecen a tu institución' };
  }

  return { ok: true };
};

// Listar horarios (siempre acotado a la institución del usuario). Filtros
// opcionales por query: grupoId, docenteId, asignaturaId, diaSemana, anioAcademicoId
const obtenerHorarios = async (req, res) => {
  try {
    const { grupoId, docenteId, asignaturaId, diaSemana, anioAcademicoId } = req.query;

    const filtro = { institucionId: req.usuario.institucionId };
    if (grupoId) filtro.grupoId = grupoId;
    if (docenteId) filtro.docenteId = docenteId;
    if (asignaturaId) filtro.asignaturaId = asignaturaId;
    if (diaSemana) filtro.diaSemana = diaSemana;
    if (anioAcademicoId) filtro.anioAcademicoId = anioAcademicoId;

    const horarios = await Horario.find(filtro)
      .sort({ diaSemana: 1, horaInicio: 1 })
      .populate('grupoId', 'nombre grado')
      .populate('asignaturaId', 'nombre')
      .populate('docenteId', 'nombres apellidos');

    res.json(horarios);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Obtener un bloque de horario por ID
const obtenerHorarioPorId = async (req, res) => {
  try {
    const horario = await Horario.findById(req.params.id)
      .populate('grupoId', 'nombre grado')
      .populate('asignaturaId', 'nombre')
      .populate('docenteId', 'nombres apellidos');

    if (!horario) {
      return res.status(404).json({ mensaje: 'Bloque de horario no encontrado' });
    }
    if (String(horario.institucionId) !== String(req.usuario.institucionId)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para ver este horario' });
    }

    res.json(horario);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Crear un bloque de horario
const crearHorario = async (req, res) => {
  try {
    const {
      anioAcademicoId, grupoId, asignaturaId, docenteId, diaSemana, horaInicio, horaFin
    } = req.body;

    if (!anioAcademicoId || !grupoId || !asignaturaId || !docenteId || !diaSemana || !horaInicio || !horaFin) {
      return res.status(400).json({
        mensaje: 'Faltan campos requeridos: anioAcademicoId, grupoId, asignaturaId, docenteId, diaSemana, horaInicio, horaFin'
      });
    }

    const pertenencia = await validarPertenencia(req, { grupoId, asignaturaId, docenteId });
    if (!pertenencia.ok) {
      return res.status(400).json({ mensaje: pertenencia.mensaje });
    }

    const choque = await buscarChoqueHorario({ anioAcademicoId, grupoId, docenteId, diaSemana, horaInicio, horaFin });
    if (choque) {
      return res.status(409).json({ mensaje: choque.mensaje, tipoChoque: choque.tipo });
    }

    const nuevoHorario = new Horario({
      ...req.body,
      institucionId: req.usuario.institucionId
    });
    const guardado = await nuevoHorario.save();

    res.status(201).json(guardado);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Actualizar un bloque de horario
const actualizarHorario = async (req, res) => {
  try {
    const existente = await Horario.findById(req.params.id);
    if (!existente) {
      return res.status(404).json({ mensaje: 'Bloque de horario no encontrado' });
    }
    if (String(existente.institucionId) !== String(req.usuario.institucionId)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para editar este horario' });
    }

    // No se permite cambiar institucionId ni anioAcademicoId desde aquí.
    const { institucionId, anioAcademicoId, ...camposPermitidos } = req.body;

    const grupoId = camposPermitidos.grupoId || existente.grupoId;
    const asignaturaId = camposPermitidos.asignaturaId || existente.asignaturaId;
    const docenteId = camposPermitidos.docenteId || existente.docenteId;
    const diaSemana = camposPermitidos.diaSemana || existente.diaSemana;
    const horaInicio = camposPermitidos.horaInicio || existente.horaInicio;
    const horaFin = camposPermitidos.horaFin || existente.horaFin;

    if (
      String(grupoId) !== String(existente.grupoId)
      || String(asignaturaId) !== String(existente.asignaturaId)
      || String(docenteId) !== String(existente.docenteId)
    ) {
      const pertenencia = await validarPertenencia(req, { grupoId, asignaturaId, docenteId });
      if (!pertenencia.ok) {
        return res.status(400).json({ mensaje: pertenencia.mensaje });
      }
    }

    const choque = await buscarChoqueHorario({
      anioAcademicoId: existente.anioAcademicoId, grupoId, docenteId, diaSemana, horaInicio, horaFin, excluirId: existente._id
    });
    if (choque) {
      return res.status(409).json({ mensaje: choque.mensaje, tipoChoque: choque.tipo });
    }

    const actualizado = await Horario.findByIdAndUpdate(
      req.params.id,
      camposPermitidos,
      { new: true, runValidators: true }
    );

    res.json(actualizado);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Eliminar un bloque de horario
const eliminarHorario = async (req, res) => {
  try {
    const existente = await Horario.findById(req.params.id);
    if (!existente) {
      return res.status(404).json({ mensaje: 'Bloque de horario no encontrado' });
    }
    if (String(existente.institucionId) !== String(req.usuario.institucionId)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para eliminar este horario' });
    }

    await Horario.findByIdAndDelete(req.params.id);

    res.json({ mensaje: 'Bloque de horario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// GET /api/horarios/grupo/:grupoId?anioAcademicoId=
// Horario semanal completo de un grupo, ordenado por día y hora.
const obtenerHorarioGrupo = async (req, res) => {
  try {
    const grupo = await Grupo.findById(req.params.grupoId).select('institucionId nombre grado');
    if (!grupo) {
      return res.status(404).json({ mensaje: 'Grupo no encontrado' });
    }
    if (String(grupo.institucionId) !== String(req.usuario.institucionId)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para ver el horario de este grupo' });
    }

    const filtro = { grupoId: grupo._id };
    if (req.query.anioAcademicoId) filtro.anioAcademicoId = req.query.anioAcademicoId;

    const bloques = await Horario.find(filtro)
      .sort({ diaSemana: 1, horaInicio: 1 })
      .populate('asignaturaId', 'nombre')
      .populate('docenteId', 'nombres apellidos');

    res.json({ grupo: { id: grupo._id, nombre: grupo.nombre, grado: grupo.grado }, bloques });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// GET /api/horarios/docente/:id?anioAcademicoId=
// Horario semanal completo de un docente. El propio docente puede consultar
// el suyo; el resto de personal institucional puede consultar cualquiera.
const obtenerHorarioDocente = async (req, res) => {
  try {
    const docente = await Usuario.findById(req.params.id).select('institucionId tipoPerfil nombres apellidos');
    if (!docente || docente.tipoPerfil !== 'docente') {
      return res.status(404).json({ mensaje: 'Docente no encontrado' });
    }

    const { tipoPerfil, id, institucionId } = req.usuario;
    const esElMismoDocente = tipoPerfil === 'docente' && String(id) === String(docente._id);
    const esPersonalDeLaInstitucion = ['admin', 'rector', 'coordinador'].includes(tipoPerfil)
      && String(institucionId) === String(docente.institucionId);

    if (!esElMismoDocente && !esPersonalDeLaInstitucion) {
      return res.status(403).json({ mensaje: 'No tienes permisos para ver el horario de este docente' });
    }

    const filtro = { docenteId: docente._id };
    if (req.query.anioAcademicoId) filtro.anioAcademicoId = req.query.anioAcademicoId;

    const bloques = await Horario.find(filtro)
      .sort({ diaSemana: 1, horaInicio: 1 })
      .populate('grupoId', 'nombre grado')
      .populate('asignaturaId', 'nombre');

    res.json({
      docente: { id: docente._id, nombreCompleto: `${docente.nombres} ${docente.apellidos}` },
      bloques
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

module.exports = {
  obtenerHorarios,
  obtenerHorarioPorId,
  crearHorario,
  actualizarHorario,
  eliminarHorario,
  obtenerHorarioGrupo,
  obtenerHorarioDocente
};