const express = require('express');
const {
  generarBoletinPeriodo,
  generarConstanciaEstudio,
  generarConstanciaNotas,
  generarCertificadoNotas,
  generarCarnetEstudiante,
  generarCarnetPersonal,
  generarEstadisticas,
  generarEvolucionGrupo,
  generarAcumulativoGrupo,
  generarObservadorEstudiante,
  generarLibroFinalGrupo,
  generarListadoPromovidos,
  generarInformeFallas
} = require('../controllers/reportes.controller');
const { verificarToken } = require('../middlewares/auth');

const router = express.Router();

router.use(verificarToken);

// Boletín de un estudiante para un período específico (PDF)
router.get('/boletin/:matriculaId/:periodo', generarBoletinPeriodo);

// Constancias (2 formatos, según el plan de migración)
router.get('/constancia/:matriculaId', generarConstanciaEstudio);
router.get('/constancia-notas/:matriculaId', generarConstanciaNotas);

// Certificado de notas: consolidado de todos los períodos del año académico
router.get('/certificado-notas/:matriculaId', generarCertificadoNotas);

// Carnets (PDF de 2 páginas: frente y reverso, tamaño tarjeta)
router.get('/carnet/estudiante/:matriculaId', generarCarnetEstudiante);
router.get('/carnet/personal/:usuarioId', generarCarnetPersonal); // docente, admin, rector, coordinador

// Estadísticas académicas (por ahora tipo="grupo"; ?grupoId= y opcional ?periodo=)
router.get('/estadisticas/:tipo', generarEstadisticas);

// Informe acumulativo del grupo (promedio por período + acumulado por estudiante)
router.get('/acumulativo/:grupoId', generarAcumulativoGrupo);

// Informe de observador de un estudiante (opcional ?anioAcademicoId= para filtrar)
router.get('/observador/:estudianteId', generarObservadorEstudiante);

// Libro final de calificaciones del grupo
router.get('/libro-final/:grupoId', generarLibroFinalGrupo);

// Listado de promovidos/no promovidos de un año académico (opcional ?grupoId=)
router.get('/promovidos/:anioId', generarListadoPromovidos);

// Informe de fallas académicas (áreas/asignaturas reprobadas) del grupo
router.get('/fallas/:grupoId', generarInformeFallas);

// Evolución académica del grupo a lo largo de los períodos del año
router.get('/evolucion/:grupoId', generarEvolucionGrupo);

module.exports = router;