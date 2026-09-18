const express = require('express');
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");
const { permitirRoles } = require("../middlewares/roleAuth");
const {
  obtenerVotos,
  obtenerVotoPorId,
  crearVoto,
  actualizarVoto,
  eliminarVoto,
  obtenerResultados,
} = require('../controllers/voto.controller');

router.use(verificarToken);

// Ruta específica antes de "/:id" para que no se confunda con un id de voto
router.get('/resultados/:eventoId', obtenerResultados);

// Endpoints de Votos
router.get('/', obtenerVotos);
router.get('/:id', obtenerVotoPorId);
router.post('/', permitirRoles('estudiante'), crearVoto);
router.put('/:id', permitirRoles('admin', 'rector'), actualizarVoto);
router.delete('/:id', permitirRoles('admin', 'rector'), eliminarVoto);

module.exports = router;