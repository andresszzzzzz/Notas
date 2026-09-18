const express = require("express");
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");
const { permitirRoles } = require("../middlewares/roleAuth");

const {
  obtenerEventosElectorales,
  obtenerEventoElectoralPorId,
  crearEventoElectoral,
  actualizarEventoElectoral,
  eliminarEventoElectoral,
} = require("../controllers/eventoelectoral.controller");

router.use(verificarToken);

const puedeGestionarEventos = permitirRoles("admin", "rector", "coordinador");

// Endpoints de Eventos Electorales
router.get("/", obtenerEventosElectorales);
router.get("/:id", obtenerEventoElectoralPorId);
router.post("/", puedeGestionarEventos, crearEventoElectoral);
router.put("/:id", puedeGestionarEventos, actualizarEventoElectoral);
router.delete("/:id", puedeGestionarEventos, eliminarEventoElectoral);

module.exports = router;