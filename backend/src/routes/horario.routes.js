const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { permitirRoles } = require('../middlewares/roleAuth');

const {
  obtenerHorarios,
  obtenerHorarioPorId,
  crearHorario,
  actualizarHorario,
  eliminarHorario,
  obtenerHorarioGrupo,
  obtenerHorarioDocente
} = require('../controllers/horario.controller');

router.use(verificarToken);

// Armar/editar el horario institucional es solo para directivos: un docente
// no debería poder reorganizar unilateralmente el horario de todo el colegio.
const puedeEditarHorario = permitirRoles('admin', 'rector', 'coordinador');

// Rutas específicas primero (si no, Express interpretaría "grupo" o "docente"
// como si fueran un :id de bloque de horario).
router.get('/grupo/:grupoId', obtenerHorarioGrupo);
router.get('/docente/:id', obtenerHorarioDocente);

// Endpoints CRUD de Horario (lectura abierta a cualquier autenticado de la
// institución; escritura solo para directivos)
router.get('/', obtenerHorarios);
router.get('/:id', obtenerHorarioPorId);
router.post('/', puedeEditarHorario, crearHorario);
router.put('/:id', puedeEditarHorario, actualizarHorario);
router.delete('/:id', puedeEditarHorario, eliminarHorario);

module.exports = router;