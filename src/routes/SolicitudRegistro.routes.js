const express = require('express');
const router = express.Router();
const {
  obtenerSolicitudes,
  obtenerSolicitudPorId,
  crearSolicitud,
  actualizarSolicitud,
  eliminarSolicitud,
} = require('../controllers/solicitudregistro.controller');

// Endpoints de Solicitudes de Registro
router.get('/', obtenerSolicitudes);
router.get('/:id', obtenerSolicitudPorId);
router.post('/', crearSolicitud);
router.put('/:id', actualizarSolicitud);
router.delete('/:id', eliminarSolicitud);

module.exports = router;