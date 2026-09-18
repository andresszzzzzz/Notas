const express = require('express');
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");
const {
  obtenerMatriculas,
  obtenerMatriculaPorId,
  crearMatricula,
  actualizarMatricula,
  eliminarMatricula,
} = require('../controllers/matricula.controller');

router.use(verificarToken);

// Endpoints de Matrículas
router.get('/', obtenerMatriculas);
router.get('/:id', obtenerMatriculaPorId);
router.post('/', crearMatricula);
router.put('/:id', actualizarMatricula);
router.delete('/:id', eliminarMatricula);

module.exports = router;