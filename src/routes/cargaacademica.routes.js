const express = require('express');
const router = express.Router();

const {
  obtenerCargasAcademicas,
  obtenerCargaAcademicaPorId,
  crearCargaAcademica,
  actualizarCargaAcademica,
  eliminarCargaAcademica,
} = require('../controllers/cargaacademica.controller');

// Endpoints de Cargas Académicas
router.get('/', obtenerCargasAcademicas);
router.get('/:id', obtenerCargaAcademicaPorId);
router.post('/', crearCargaAcademica);
router.put('/:id', actualizarCargaAcademica);
router.delete('/:id', eliminarCargaAcademica);

module.exports = router;