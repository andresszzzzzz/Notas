const express = require("express");
const router = express.Router();

const {
  obtenerAsignaturas,
  obtenerAsignaturaPorId,
  crearAsignatura,
  actualizarAsignatura,
  eliminarAsignatura,
  obtenerAsignaturasPorInstitucion,
  obtenerAsignaturasPorArea,
} = require("../controllers/asignatura.controller");

// Endpoints de Asignaturas
router.get("/", obtenerAsignaturas);
router.get("/institucion/:institucionId", obtenerAsignaturasPorInstitucion);
router.get("/area/:areaId", obtenerAsignaturasPorArea);
router.get("/:id", obtenerAsignaturaPorId);
router.post("/", crearAsignatura);
router.put("/:id", actualizarAsignatura);
router.delete("/:id", eliminarAsignatura);

module.exports = router;