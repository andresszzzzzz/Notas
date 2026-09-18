const express = require('express');
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");

const {
  obtenerDirecciones,
  obtenerDireccionPorId,
  crearDireccion,
  actualizarDireccion,
  eliminarDireccion,
} = require('../controllers/direccionnucleo.controller');

router.use(verificarToken);

// Endpoints de Direcciones de Núcleo
router.get('/', obtenerDirecciones);
router.get('/:id', obtenerDireccionPorId);
router.post('/', crearDireccion);
router.put('/:id', actualizarDireccion);
router.delete('/:id', eliminarDireccion);

module.exports = router;