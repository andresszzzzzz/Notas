const express = require("express");
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");

const {
  obtenerElecciones,
  obtenerEleccionPorId,
  crearEleccion,
  actualizarEleccion,
  eliminarEleccion,
} = require("../controllers/elecciones.controller");

router.use(verificarToken);

// Endpoints de Elecciones
router.get("/", obtenerElecciones);
router.get("/:id", obtenerEleccionPorId);
router.post("/", crearEleccion);
router.put("/:id", actualizarEleccion);
router.delete("/:id", eliminarEleccion);

module.exports = router;