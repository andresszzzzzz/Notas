const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { permitirRoles } = require('../middlewares/roleAuth');

const {
  obtenerObservaciones,
  obtenerObservacionPorId,
  crearObservacion,
  actualizarObservacion,
  eliminarObservacion,
  agregarSeguimiento,
  cambiarEstadoObservacion,
  obtenerObservacionesEstudiante
} = require('../controllers/observador.controller');

router.use(verificarToken);

// Crear, editar, eliminar y ver el listado general es solo para personal
// de la institución. Estudiantes y acudientes usan /estudiante/:id, que
// tiene su propio control de permisos dentro del controlador.
const esPersonalInstitucional = permitirRoles('docente', 'admin', 'rector', 'coordinador');

// Ruta específica primero (si no, Express interpretaría "estudiante" como un :id)
router.get('/estudiante/:id', obtenerObservacionesEstudiante);

// Endpoints del Observador (solo personal institucional)
router.get('/', esPersonalInstitucional, obtenerObservaciones);
router.get('/:id', esPersonalInstitucional, obtenerObservacionPorId);
router.post('/', esPersonalInstitucional, crearObservacion);
router.put('/:id', esPersonalInstitucional, actualizarObservacion);
router.delete('/:id', esPersonalInstitucional, eliminarObservacion);
router.post('/:id/seguimiento', esPersonalInstitucional, agregarSeguimiento);
router.put('/:id/estado', esPersonalInstitucional, cambiarEstadoObservacion);

module.exports = router;