const express = require("express");
const router = express.Router();

const {
  obtenerEventosElectorales,
  obtenerEventoElectoralPorId,
  crearEventoElectoral,
  actualizarEventoElectoral,
  eliminarEventoElectoral,
} = require("../controllers/eventoelectoral.controller");

// Endpoints de Eventos Electorales
router.get("/", obtenerEventosElectorales);
router.get("/:id", obtenerEventoElectoralPorId);
router.post("/", crearEventoElectoral);
router.put("/:id", actualizarEventoElectoral);
router.delete("/:id", eliminarEventoElectoral);

module.exports = router;