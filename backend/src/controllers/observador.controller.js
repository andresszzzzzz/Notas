const Observador = require('../models/Observador');
const Usuario = require('../models/Usuario');

const ESTADOS_OBSERVACION = ['abierto', 'seguimiento', 'cerrado'];

// Verifica que un usuario acudiente tenga registrado a ese estudiante entre
// sus relaciones (mismo criterio que ya se usa en reportes).
const esAcudienteDe = async (acudienteId, estudianteId) => {
  const acudiente = await Usuario.findById(acudienteId).select('estudiantes');
  return !!acudiente && acudiente.estudiantes.some((rel) => String(rel.estudianteId) === String(estudianteId));
};

// Obtener todos los registros del observador (solo personal de la institución
// del usuario logueado; siempre acotado a esa institución, nunca a todas).
// Filtros opcionales por query: estudianteId, tipo, categoria, gravedad, estado, anioAcademicoId
const obtenerObservaciones = async (req, res) => {
  try {
    const { estudianteId, tipo, categoria, gravedad, estado, anioAcademicoId } = req.query;

    const filtro = { institucionId: req.usuario.institucionId };
    if (estudianteId) filtro.estudianteId = estudianteId;
    if (tipo) filtro.tipo = tipo;
    if (categoria) filtro.categoria = categoria;
    if (gravedad) filtro.gravedad = gravedad;
    if (estado) filtro.estado = estado;
    if (anioAcademicoId) filtro.anioAcademicoId = anioAcademicoId;

    const observaciones = await Observador.find(filtro)
      .sort({ fecha: -1 })
      .populate('estudianteId', 'nombres apellidos documento')
      .populate('docenteId', 'nombres apellidos')
      .populate('coordinadorId', 'nombres apellidos')
      .populate('seguimiento.responsable', 'nombres apellidos');

    res.json(observaciones);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Obtener un registro por ID (solo personal de la misma institución del registro)
const obtenerObservacionPorId = async (req, res) => {
  try {
    const observacion = await Observador.findById(req.params.id)
      .populate('institucionId')
      .populate('anioAcademicoId')
      .populate('estudianteId', 'nombres apellidos documento')
      .populate('docenteId', 'nombres apellidos')
      .populate('coordinadorId', 'nombres apellidos')
      .populate('seguimiento.responsable', 'nombres apellidos');

    if (!observacion) {
      return res.status(404).json({ mensaje: 'Registro no encontrado' });
    }

    if (String(observacion.institucionId._id) !== String(req.usuario.institucionId)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para ver este registro' });
    }

    res.json(observacion);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Crear un registro. Se fuerza institucionId al del usuario logueado (nunca se
// confía en lo que venga en el body para ese campo) y se valida que el
// estudiante exista y pertenezca a esa misma institución.
const crearObservacion = async (req, res) => {
  try {
    const { estudianteId } = req.body;

    const estudiante = await Usuario.findById(estudianteId).select('institucionId tipoPerfil');
    if (!estudiante || estudiante.tipoPerfil !== 'estudiante') {
      return res.status(404).json({ mensaje: 'Estudiante no encontrado' });
    }
    if (String(estudiante.institucionId) !== String(req.usuario.institucionId)) {
      return res.status(403).json({ mensaje: 'El estudiante no pertenece a tu institución' });
    }

    const nuevaObservacion = new Observador({
      ...req.body,
      institucionId: req.usuario.institucionId,
      docenteId: req.body.docenteId || (req.usuario.tipoPerfil === 'docente' ? req.usuario.id : undefined)
    });
    const observacionGuardada = await nuevaObservacion.save();

    res.status(201).json(observacionGuardada);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Actualizar un registro (no se permite cambiar institucionId ni estudianteId
// desde aquí; para eso se elimina y se crea uno nuevo)
const actualizarObservacion = async (req, res) => {
  try {
    const existente = await Observador.findById(req.params.id);
    if (!existente) {
      return res.status(404).json({ mensaje: 'Registro no encontrado' });
    }
    if (String(existente.institucionId) !== String(req.usuario.institucionId)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para editar este registro' });
    }

    const { institucionId, estudianteId, ...camposPermitidos } = req.body;

    const observacionActualizada = await Observador.findByIdAndUpdate(
      req.params.id,
      camposPermitidos,
      { new: true, runValidators: true }
    );

    res.json(observacionActualizada);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Eliminar un registro
const eliminarObservacion = async (req, res) => {
  try {
    const existente = await Observador.findById(req.params.id);
    if (!existente) {
      return res.status(404).json({ mensaje: 'Registro no encontrado' });
    }
    if (String(existente.institucionId) !== String(req.usuario.institucionId)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para eliminar este registro' });
    }

    await Observador.findByIdAndDelete(req.params.id);

    res.json({ mensaje: 'Registro eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// POST /api/observador/:id/seguimiento
// Agrega una entrada de seguimiento SIN sobrescribir el resto del registro.
// Body: { observacion, fecha? (default: ahora), cerrarCaso? (boolean, default false) }
const agregarSeguimiento = async (req, res) => {
  try {
    const { observacion, fecha, cerrarCaso } = req.body;

    if (!observacion || !observacion.trim()) {
      return res.status(400).json({ mensaje: 'El campo "observacion" es obligatorio' });
    }

    const registro = await Observador.findById(req.params.id);
    if (!registro) {
      return res.status(404).json({ mensaje: 'Registro no encontrado' });
    }
    if (String(registro.institucionId) !== String(req.usuario.institucionId)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para modificar este registro' });
    }

    registro.seguimiento.push({
      fecha: fecha ? new Date(fecha) : new Date(),
      observacion: observacion.trim(),
      responsable: req.usuario.id
    });

    if (cerrarCaso) {
      registro.estado = 'cerrado';
    } else if (registro.estado === 'abierto') {
      // Si se agrega el primer seguimiento, el caso pasa de "abierto" a "en seguimiento".
      registro.estado = 'seguimiento';
    }

    await registro.save();

    res.status(200).json({ mensaje: 'Seguimiento agregado correctamente', registro });
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// PUT /api/observador/:id/estado
// Cambia el estado del caso directamente (abierto | seguimiento | cerrado).
const cambiarEstadoObservacion = async (req, res) => {
  try {
    const { estado } = req.body;

    if (!ESTADOS_OBSERVACION.includes(estado)) {
      return res.status(400).json({ mensaje: `El estado debe ser uno de: ${ESTADOS_OBSERVACION.join(', ')}` });
    }

    const registro = await Observador.findById(req.params.id);
    if (!registro) {
      return res.status(404).json({ mensaje: 'Registro no encontrado' });
    }
    if (String(registro.institucionId) !== String(req.usuario.institucionId)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para modificar este registro' });
    }

    registro.estado = estado;
    await registro.save();

    res.json(registro);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// GET /api/observador/estudiante/:id?anioAcademicoId=&tipo=
// Historial de observador de UN estudiante. A diferencia del listado general,
// este endpoint SÍ pueden usarlo el propio estudiante y su acudiente (acotado
// solo a ese estudiante), además del personal de su institución.
const obtenerObservacionesEstudiante = async (req, res) => {
  try {
    const estudiante = await Usuario.findById(req.params.id).select('institucionId tipoPerfil nombres apellidos documento');
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
      autorizado = await esAcudienteDe(id, estudiante._id);
    }

    if (!autorizado) {
      return res.status(403).json({ mensaje: 'No tienes permisos para ver el observador de este estudiante' });
    }

    const { anioAcademicoId, tipo } = req.query;
    const filtro = { estudianteId: estudiante._id };
    if (anioAcademicoId) filtro.anioAcademicoId = anioAcademicoId;
    if (tipo) filtro.tipo = tipo;

    const observaciones = await Observador.find(filtro)
      .sort({ fecha: -1 })
      .populate('docenteId', 'nombres apellidos')
      .populate('coordinadorId', 'nombres apellidos')
      .populate('seguimiento.responsable', 'nombres apellidos');

    res.json({
      estudiante: {
        id: estudiante._id,
        nombreCompleto: `${estudiante.nombres} ${estudiante.apellidos}`,
        documento: estudiante.documento
      },
      total: observaciones.length,
      observaciones
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

module.exports = {
  obtenerObservaciones,
  obtenerObservacionPorId,
  crearObservacion,
  actualizarObservacion,
  eliminarObservacion,
  agregarSeguimiento,
  cambiarEstadoObservacion,
  obtenerObservacionesEstudiante
};