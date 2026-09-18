const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');

const {
  obtenerCalificaciones,
  obtenerCalificacionPorId,
  crearCalificacion,
  actualizarCalificacion,
  eliminarCalificacion,
  calificarGrupoMasivo,
  consultarNotasConsolidadasEstudiante,
  cerrarPeriodo,
} = require('../controllers/calificacion.controller');

// Antes esta ruta no exigía token; se agrega aquí (faltaba en el archivo original).
router.use(verificarToken);

// Rutas específicas primero (si no, Express interpretaría "masivo", "estudiante"
// o "cerrar-periodo" como si fueran un :id de calificación).
router.post('/masivo', calificarGrupoMasivo);
router.get('/estudiante/:id', consultarNotasConsolidadasEstudiante);
router.post('/cerrar-periodo', cerrarPeriodo);

// Endpoints CRUD de Calificaciones
router.get('/', obtenerCalificaciones);
router.get('/:id', obtenerCalificacionPorId);
router.post('/', crearCalificacion);
router.put('/:id', actualizarCalificacion);
router.delete('/:id', eliminarCalificacion);

module.exports = router;