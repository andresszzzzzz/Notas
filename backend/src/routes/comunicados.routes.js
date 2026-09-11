const express = require('express');
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");

const {
  obtenerComunicados,
  obtenerComunicadoPorId,
  crearComunicado,
  actualizarComunicado,
  eliminarComunicado,
} = require('../controllers/comunicados.controller');

router.use(verificarToken);

// Endpoints de Comunicados
router.get('/', obtenerComunicados);
router.get('/:id', obtenerComunicadoPorId);
router.post('/', crearComunicado);
router.put('/:id', actualizarComunicado);
router.delete('/:id', eliminarComunicado);

module.exports = router;