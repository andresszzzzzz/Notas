const express = require("express");
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");

const {
  obtenerAreas,
  obtenerAreasPorInstitucion,
  obtenerAreaPorId,
  crearArea,
  actualizarArea,
  eliminarArea,
  obtenerAreasPorEstado,
} = require("../controllers/area.controller");

router.use(verificarToken);

// Endpoints de Áreas
router.get("/", obtenerAreas);
router.get("/institucion/:institucionId", obtenerAreasPorInstitucion);
router.get("/estado/:estado", obtenerAreasPorEstado);
router.get("/:id", obtenerAreaPorId);
router.post("/", crearArea);
router.put("/:id", actualizarArea);
router.delete("/:id", eliminarArea);

module.exports = router;