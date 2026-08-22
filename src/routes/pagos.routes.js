const express = require('express');
const router = express.Router();
const {
  obtenerPagos,
  obtenerPagoPorId,
  crearPago,
  actualizarPago,
  eliminarPago,
} = require('../controllers/pagos.controller');

// Endpoints de Pagos
router.get('/', obtenerPagos);
router.get('/:id', obtenerPagoPorId);
router.post('/', crearPago);
router.put('/:id', actualizarPago);
router.delete('/:id', eliminarPago);

module.exports = router;