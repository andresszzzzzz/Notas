const express = require('express');
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");
const {
  obtenerSolicitudes,
  obtenerSolicitudPorId,
  crearSolicitud,
  actualizarSolicitud,
  eliminarSolicitud,
} = require('../controllers/solicitudregistro.controller');

router.use(verificarToken);

// Endpoints de Solicitudes de Registro
router.get('/', obtenerSolicitudes);
router.get('/:id', obtenerSolicitudPorId);
router.post('/', crearSolicitud);
router.put('/:id', actualizarSolicitud);
router.delete('/:id', eliminarSolicitud);

module.exports = router;