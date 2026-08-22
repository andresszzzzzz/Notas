const express = require('express');
const router = express.Router();
const {
  obtenerSedes,
  obtenerSedePorId,
  crearSede,
  actualizarSede,
  eliminarSede,
} = require('../controllers/sede.controller');

// Endpoints de Sedes
router.get('/', obtenerSedes);
router.get('/:id', obtenerSedePorId);
router.post('/', crearSede);
router.put('/:id', actualizarSede);
router.delete('/:id', eliminarSede);

module.exports = router;