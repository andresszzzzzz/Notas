const express = require('express');
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");
const { permitirRoles } = require("../middlewares/roleAuth");
const {
  obtenerPagos,
  obtenerPagoPorId,
  crearPago,
  actualizarPago,
  eliminarPago,
  generarPagosMasivos,
  obtenerCartera,
  obtenerMora,
} = require('../controllers/pagos.controller');

router.use(verificarToken);

const puedeGestionarPagos = permitirRoles('admin', 'rector');

// Rutas específicas primero (si no, "/:id" se las comería como si fueran un id)
router.post('/generar-masivo', puedeGestionarPagos, generarPagosMasivos);
router.get('/reportes/cartera', puedeGestionarPagos, obtenerCartera);
router.get('/reportes/mora', puedeGestionarPagos, obtenerMora);

// Endpoints de Pagos
router.get('/', obtenerPagos);
router.get('/:id', obtenerPagoPorId);
router.post('/', crearPago);
router.put('/:id', actualizarPago);
router.delete('/:id', eliminarPago);

module.exports = router;