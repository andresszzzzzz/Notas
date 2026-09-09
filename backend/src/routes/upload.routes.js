const express = require('express');
const { subirFotoUsuario, subirImagenInstitucion } = require('../controllers/upload.controller');
const { verificarToken } = require('../middlewares/auth');
const { permitirRoles } = require('../middlewares/roleAuth');
const { crearUploader } = require('../middlewares/upload');

const router = express.Router();

const subirFoto = crearUploader('usuarios');
const subirImagenInst = crearUploader('instituciones');

router.use(verificarToken);

// Foto de perfil / carnet de un usuario
router.post('/usuarios/:id/foto', subirFoto.single('imagen'), subirFotoUsuario);

// Logo, escudo, firmas o plantillas de carnet de la institución
router.post(
  '/instituciones/:id/:tipo',
  permitirRoles('admin', 'rector'),
  subirImagenInst.single('imagen'),
  subirImagenInstitucion
);

module.exports = router;
