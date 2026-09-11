const express = require("express");
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");

const {
  obtenerRegistros,
  obtenerRegistrosPorInstitucion,
  obtenerRegistrosPorUsuario,
  obtenerRegistrosPorAccion,
  obtenerRegistroPorId,
  crearRegistro,
  eliminarRegistro,
} = require("../controllers/bitacora.controller");

router.use(verificarToken);

// Endpoints de Bitácora
router.get("/", obtenerRegistros);
router.get("/institucion/:institucionId", obtenerRegistrosPorInstitucion);
router.get("/usuario/:usuarioId", obtenerRegistrosPorUsuario);
router.get("/accion/:accion", obtenerRegistrosPorAccion);
router.get("/:id", obtenerRegistroPorId);
router.post("/", crearRegistro);
router.delete("/:id", eliminarRegistro);

module.exports = router;