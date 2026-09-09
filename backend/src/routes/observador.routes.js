const express = require('express');
const router = express.Router();
const {
  obtenerObservaciones,
  obtenerObservacionPorId,
  crearObservacion,
  actualizarObservacion,
  eliminarObservacion,
} = require('../controllers/observador.controller');

// Endpoints del Observador
router.get('/', obtenerObservaciones);
router.get('/:id', obtenerObservacionPorId);
router.post('/', crearObservacion);
router.put('/:id', actualizarObservacion);
router.delete('/:id', eliminarObservacion);

module.exports = router;