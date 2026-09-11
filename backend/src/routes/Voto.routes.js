const express = require('express');
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");
const {
  obtenerVotos,
  obtenerVotoPorId,
  crearVoto,
  actualizarVoto,
  eliminarVoto,
} = require('../controllers/voto.controller');

router.use(verificarToken);

// Endpoints de Votos
router.get('/', obtenerVotos);
router.get('/:id', obtenerVotoPorId);
router.post('/', crearVoto);
router.put('/:id', actualizarVoto);
router.delete('/:id', eliminarVoto);

module.exports = router;