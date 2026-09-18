const express = require('express');
const { constancia, certificado, carnet } = require('../controllers/documentos.controller');
const { verificarToken } = require('../middlewares/auth');

const router = express.Router();

router.use(verificarToken);

// Documentos disponibles solo para estudiantes, docentes y administrativos.
// El propio usuario puede generar el suyo; admin/rector/coordinador pueden
// generarlo para cualquier persona de su institución.
router.get('/constancia/:usuarioId', constancia);
router.get('/certificado/:usuarioId', certificado);
router.get('/carnet/:usuarioId', carnet);

module.exports = router;