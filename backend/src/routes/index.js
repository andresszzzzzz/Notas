const express = require("express");

const router = express.Router();

// Rutas disponibles
router.use("/auth", require("./auth.routes"));
router.use("/nucleo", require("./nucleo.routes"));
router.use("/registro", require("./registro.routes"));
router.use("/usuarios", require("./usuario.routes"));
router.use("/instituciones", require("./institucion.routes"));
router.use("/sedes", require("./Sede.routes"));
router.use("/anios-academicos", require("./AnioAcademico.routes"));
router.use("/grupos", require("./grupo.routes"));
router.use("/areas", require("./Area.routes"));
router.use("/asignaturas", require("./Asignatura.routes"));
router.use("/cargas-academicas", require("./cargaacademica.routes"));
router.use("/matriculas", require("./matricula.routes"));
router.use("/prematriculas", require("./prematricula.routes"));
router.use("/indicadores", require("./indicador.routes"));
router.use("/actividades", require("./Actividad.routes"));
router.use("/calificaciones", require("./calificacion.routes"));
router.use("/direccion-nucleo", require("./direccionnucleo.routes"));
router.use("/bitacora", require("./Bitacora.routes"));
router.use("/observador", require("./observador.routes"));
router.use("/excusas", require("./excusas.routes"));
router.use("/conceptos-contables", require("./conceptoscontables.routes"));
router.use("/pagos", require("./pagos.routes"));
router.use("/elecciones", require("./elecciones.routes"));
router.use("/eventos-electorales", require("./eventoelectoral.routes"));
router.use("/votos", require("./Voto.routes"));
router.use("/catalogos", require("./catalogo.routes"));
router.use("/comunicados", require("./comunicados.routes"));
router.use("/solicitudes-registro", require("./SolicitudRegistro.routes"));
router.use("/uploads", require("./upload.routes"));
router.use("/reportes", require("./reportes.routes"));

module.exports = router;
