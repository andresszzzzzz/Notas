const { Router } = require('express');
const {
  listarInstituciones,
  crearInstitucion,
  crearAdminInstitucion,
  listarSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
  estadisticas,
  estadisticasPorInstitucion,
  comparativo,
  reportes
} = require('../controllers/nucleo.controller');
const { verificarToken } = require('../middlewares/auth');
const { permitirRoles } = require('../middlewares/roleAuth');

const router = Router();

// Todo este módulo es exclusivo del rol dirNucleo.
router.use(verificarToken, permitirRoles('dirNucleo'));

router.get('/instituciones', listarInstituciones);
router.post('/instituciones', crearInstitucion);
router.post('/instituciones/:id/admin', crearAdminInstitucion);

router.get('/solicitudes', listarSolicitudes);
router.put('/solicitudes/:id/aprobar', aprobarSolicitud);
router.put('/solicitudes/:id/rechazar', rechazarSolicitud);

router.get('/estadisticas', estadisticas);
router.get('/estadisticas/:instId', estadisticasPorInstitucion);
router.get('/comparativo', comparativo);
router.get('/reportes/:tipo', reportes);

module.exports = router;
