const express = require("express");
const router = express.Router();

const {
  obtenerActividades,
  obtenerActividadPorId,
  crearActividad,
  actualizarActividad,
  eliminarActividad,
  obtenerActividadesPorGrupo,
  obtenerActividadesPorAsignatura,
  obtenerActividadesPorDocente,
  obtenerActividadesPorPeriodo,
} = require("../controllers/actividad.controller");

// ======================================
// Endpoints de Actividades
// ======================================
router.get("/", obtenerActividades);
router.get("/:id", obtenerActividadPorId);
router.post("/", crearActividad);
router.put("/:id", actualizarActividad);
router.delete("/:id", eliminarActividad);

router.get("/grupo/:grupoId", obtenerActividadesPorGrupo);
router.get("/asignatura/:asignaturaId", obtenerActividadesPorAsignatura);
router.get("/docente/:docenteId", obtenerActividadesPorDocente);
router.get("/periodo/:periodo", obtenerActividadesPorPeriodo);

module.exports = router;