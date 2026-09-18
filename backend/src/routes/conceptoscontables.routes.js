const express = require('express');
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");

const {
  obtenerConceptos,
  obtenerConceptoPorId,
  crearConcepto,
  actualizarConcepto,
  eliminarConcepto,
} = require('../controllers/conceptoscontables.controller');

router.use(verificarToken);

// Endpoints de Conceptos Contables
router.get('/', obtenerConceptos);
router.get('/:id', obtenerConceptoPorId);
router.post('/', crearConcepto);
router.put('/:id', actualizarConcepto);
router.delete('/:id', eliminarConcepto);

module.exports = router;