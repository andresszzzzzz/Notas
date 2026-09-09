const express = require('express');
const { generarBoletinPeriodo } = require('../controllers/reportes.controller');
const { verificarToken } = require('../middlewares/auth');

const router = express.Router();

router.use(verificarToken);

// Boletín de un estudiante para un período específico (PDF)
router.get('/boletin/:matriculaId/:periodo', generarBoletinPeriodo);

module.exports = router;
