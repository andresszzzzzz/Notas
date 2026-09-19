const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { permitirRoles } = require('../middlewares/roleAuth');

const {
  obtenerAsistencias,
  obtenerAsistenciaPorId,
  crearAsistencia,
  actualizarAsistencia,
  eliminarAsistencia,
  registrarAsistenciaMasiva,
  obtenerAsistenciaGrupoFecha,
  obtenerResumenEstudiante
} = require('../controllers/asistencia.controller');

router.use(verificarToken);

const puedeRegistrarAsistencia = permitirRoles('docente', 'admin', 'rector', 'coordinador');

// Rutas específicas primero (si no, Express interpretaría "masivo", "grupo" o
// "estudiante" como si fueran un :id de asistencia).
router.post('/masivo', puedeRegistrarAsistencia, registrarAsistenciaMasiva);
router.get('/grupo/:grupoId', obtenerAsistenciaGrupoFecha);
router.get('/estudiante/:id', obtenerResumenEstudiante);

// Endpoints CRUD de Asistencia
router.get('/', obtenerAsistencias);
router.get('/:id', obtenerAsistenciaPorId);
router.post('/', puedeRegistrarAsistencia, crearAsistencia);
router.put('/:id', puedeRegistrarAsistencia, actualizarAsistencia);
router.delete('/:id', puedeRegistrarAsistencia, eliminarAsistencia);

module.exports = router;