const express = require("express");
const router = express.Router();

const {
  obtenerExcusas,
  obtenerExcusaPorId,
  crearExcusa,
  actualizarExcusa,
  eliminarExcusa,
} = require("../controllers/excusas.controller");

// Endpoints de Excusas
router.get("/", obtenerExcusas);
router.get("/:id", obtenerExcusaPorId);
router.post("/", crearExcusa);
router.put("/:id", actualizarExcusa);
router.delete("/:id", eliminarExcusa);

module.exports = router;