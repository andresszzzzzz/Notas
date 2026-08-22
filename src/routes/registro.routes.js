const { Router } = require('express');
const {
  listarNucleos,
  crearSolicitud,
  consultarSolicitud
} = require('../controllers/registro.controller');

const router = Router();

// Rutas públicas, sin autenticación.
router.get('/nucleos', listarNucleos);
router.post('/solicitud', crearSolicitud);
router.get('/solicitud/:id', consultarSolicitud);

module.exports = router;
