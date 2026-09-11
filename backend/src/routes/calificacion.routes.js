const express = require('express');
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");

const {
  obtenerCalificaciones,
  obtenerCalificacionPorId,
  crearCalificacion,
  actualizarCalificacion,
  eliminarCalificacion,
} = require('../controllers/calificacion.controller');

router.use(verificarToken);

// Endpoints de Calificaciones
router.get('/', obtenerCalificaciones);
router.get('/:id', obtenerCalificacionPorId);
router.post('/', crearCalificacion);
router.put('/:id', actualizarCalificacion);
router.delete('/:id', eliminarCalificacion);

module.exports = router;