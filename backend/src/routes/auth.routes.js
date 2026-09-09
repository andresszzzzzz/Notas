const { Router } = require('express');
const {
  login,
  logout,
  cambiarPassword,
  recuperarPassword,
  me,
  cronograma
} = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth');

const router = Router();

// Públicas
router.post('/login', login);
router.post('/recuperar-password', recuperarPassword);

// Protegidas
router.post('/logout', verificarToken, logout);
router.post('/cambiar-password', verificarToken, cambiarPassword);
router.get('/me', verificarToken, me);
router.get('/cronograma', verificarToken, cronograma);

module.exports = router;
