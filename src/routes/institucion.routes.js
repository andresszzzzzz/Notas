const express = require('express');
const router = express.Router();
const {
  obtenerInstituciones,
  obtenerInstitucionPorId,
  crearInstitucion,
  actualizarInstitucion,
  eliminarInstitucion,
} = require('../controllers/institucion.controller');

// Endpoints de Instituciones
router.get('/', obtenerInstituciones);
router.get('/:id', obtenerInstitucionPorId);
router.post('/', crearInstitucion);
router.put('/:id', actualizarInstitucion);
router.delete('/:id', eliminarInstitucion);

module.exports = router;