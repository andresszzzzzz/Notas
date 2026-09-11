const express = require('express');
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");
const { permitirRoles } = require("../middlewares/roleAuth");

const {
  obtenerCalificaciones,
  obtenerCalificacionPorId,
  crearCalificacion,
  actualizarCalificacion,
  eliminarCalificacion,
  registrarRecuperacion,
  registrarHabilitacion,
} = require('../controllers/calificacion.controller');

router.use(verificarToken);

const puedeCalificar = permitirRoles('docente', 'admin', 'rector', 'coordinador');

// Endpoints de Calificaciones
router.get('/', obtenerCalificaciones);
router.get('/:id', obtenerCalificacionPorId);
router.post('/', puedeCalificar, crearCalificacion);
router.put('/:id', puedeCalificar, actualizarCalificacion);
router.delete('/:id', puedeCalificar, eliminarCalificacion);

// Recuperaciones y habilitaciones (mismos roles que pueden calificar)
router.put('/:id/recuperacion', puedeCalificar, registrarRecuperacion);
router.put('/:id/habilitacion', puedeCalificar, registrarHabilitacion);

module.exports = router;