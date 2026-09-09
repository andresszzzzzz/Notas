const express = require('express');
const router = express.Router();
const {
  obtenerMatriculas,
  obtenerMatriculaPorId,
  crearMatricula,
  actualizarMatricula,
  eliminarMatricula,
} = require('../controllers/matricula.controller');

// Endpoints de Matrículas
router.get('/', obtenerMatriculas);
router.get('/:id', obtenerMatriculaPorId);
router.post('/', crearMatricula);
router.put('/:id', actualizarMatricula);
router.delete('/:id', eliminarMatricula);

module.exports = router;