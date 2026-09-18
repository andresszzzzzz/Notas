const express = require('express');
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");

const {
  obtenerCatalogos,
  obtenerCatalogoPorId,
  crearCatalogo,
  actualizarCatalogo,
  eliminarCatalogo,
} = require('../controllers/catalogo.controller');

router.use(verificarToken);

// Endpoints de Catálogos
router.get('/', obtenerCatalogos);
router.get('/:id', obtenerCatalogoPorId);
router.post('/', crearCatalogo);
router.put('/:id', actualizarCatalogo);
router.delete('/:id', eliminarCatalogo);

module.exports = router;