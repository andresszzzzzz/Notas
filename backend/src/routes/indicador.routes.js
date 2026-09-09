const express = require("express");
const router = express.Router();
const {
  obtenerIndicadores,
  obtenerIndicadorPorId,
  crearIndicador,
  actualizarIndicador,
  eliminarIndicador,
} = require("../controllers/indicador.controller");

// Endpoints de Indicadores
router.get("/", obtenerIndicadores);
router.get("/:id", obtenerIndicadorPorId);
router.post("/", crearIndicador);
router.put("/:id", actualizarIndicador);
router.delete("/:id", eliminarIndicador);

module.exports = router;