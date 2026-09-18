const express = require('express');
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");
const { permitirRoles } = require("../middlewares/roleAuth");
const {
  obtenerInstituciones,
  obtenerInstitucionPorId,
  crearInstitucion,
  actualizarInstitucion,
  eliminarInstitucion,
  actualizarConfiguracion,
} = require('../controllers/institucion.controller');

router.use(verificarToken);

// Endpoints de Instituciones
router.get('/', obtenerInstituciones);
router.get('/:id', obtenerInstitucionPorId);
router.post('/', crearInstitucion);
router.put('/:id', actualizarInstitucion);
router.delete('/:id', eliminarInstitucion);

// Configuración académica (notas, periodos, niveles, habilitaciones, etc.)
// Reservado a admin/rector de la propia institución.
router.put('/:id/configuracion', permitirRoles('admin', 'rector'), actualizarConfiguracion);

module.exports = router;