const { Router } = require('express');
const {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  resetearPassword,
  cambiarEstadoUsuario
} = require('../controllers/usuario.controller');

const router = Router();

router.get('/', obtenerUsuarios);
router.get('/:id', obtenerUsuarioPorId);
router.post('/', crearUsuario);
router.put('/:id', actualizarUsuario);
router.delete('/:id', eliminarUsuario);
router.put('/:id/password', resetearPassword);
router.put('/:id/estado', cambiarEstadoUsuario);

module.exports = router;
