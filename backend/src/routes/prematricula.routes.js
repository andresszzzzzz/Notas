const express = require('express');
const router = express.Router();
const {
  obtenerPrematriculas,
  obtenerPrematriculaPorId,
  crearPrematricula,
  actualizarPrematricula,
  eliminarPrematricula,
} = require('../controllers/prematricula.controller');

// Endpoints de Prematrículas
router.get('/', obtenerPrematriculas);
router.get('/:id', obtenerPrematriculaPorId);
router.post('/', crearPrematricula);
router.put('/:id', actualizarPrematricula);
router.delete('/:id', eliminarPrematricula);

module.exports = router;  