const express = require("express");
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");

const {
  obtenerGrupos,
  obtenerGrupoPorId,
  crearGrupo,
  actualizarGrupo,
  eliminarGrupo,
} = require("../controllers/grupo.controller");

router.use(verificarToken);

// Endpoints de Grupos
router.get("/", obtenerGrupos);
router.get("/:id", obtenerGrupoPorId);
router.post("/", crearGrupo);
router.put("/:id", actualizarGrupo);
router.delete("/:id", eliminarGrupo);

module.exports = router;