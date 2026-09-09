const express = require("express");
const router = express.Router();

const {
  obtenerAnios,
  obtenerAniosPorInstitucion,
  obtenerAnioPorId,
  crearAnio,
  actualizarAnio,
  eliminarAnio,
  obtenerAniosPorEstado,
  agregarPeriodo,
  actualizarPeriodo,
  eliminarPeriodo,
} = require("../controllers/anioacademico.controller");

// Endpoints Principales
router.get("/", obtenerAnios);
router.get("/institucion/:institucionId", obtenerAniosPorInstitucion);
router.get("/estado/:estado", obtenerAniosPorEstado);
router.get("/:id", obtenerAnioPorId);
router.post("/", crearAnio);
router.put("/:id", actualizarAnio);
router.delete("/:id", eliminarAnio);

// Endpoints de Períodos
router.post("/:id/periodos", agregarPeriodo);
router.put("/:id/periodos/:periodoId", actualizarPeriodo);
router.delete("/:id/periodos/:periodoId", eliminarPeriodo);

module.exports = router;