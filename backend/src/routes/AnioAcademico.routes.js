const express = require("express");
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");
const { permitirRoles } = require("../middlewares/roleAuth");

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
  previsualizarCierre,
  cerrarAnio,
  listadoPromocion,
} = require("../controllers/anioacademico.controller");

router.use(verificarToken);

// Solo estos roles pueden ver/ejecutar el cierre de año y la promoción.
const puedeVerPromocion = permitirRoles("admin", "rector", "coordinador");
const puedeCerrarAnio = permitirRoles("admin", "rector");

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

// Endpoints de Cierre de Año / Promoción y Reprobación
router.get("/:id/promocion/previsualizar", puedeVerPromocion, previsualizarCierre);
router.post("/:id/promocion/cierre", puedeCerrarAnio, cerrarAnio);
router.get("/:id/promocion/listado", puedeVerPromocion, listadoPromocion);

module.exports = router;