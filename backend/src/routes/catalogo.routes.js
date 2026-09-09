const express = require('express');
const router = express.Router();

const {
  obtenerCatalogos,
  obtenerCatalogoPorId,
  crearCatalogo,
  actualizarCatalogo,
  eliminarCatalogo,
} = require('../controllers/catalogo.controller');

// Endpoints de Catálogos
router.get('/', obtenerCatalogos);
router.get('/:id', obtenerCatalogoPorId);
router.post('/', crearCatalogo);
router.put('/:id', actualizarCatalogo);
router.delete('/:id', eliminarCatalogo);

module.exports = router;