const PDFDocument = require('pdfkit');
const { dibujarEncabezadoReporte, dibujarTabla, piePagina } = require('./helpers');
 
// Genera la Planilla de Clasificación: ordena a los estudiantes de un grupo
// por su promedio (de un período específico, o el promedio final del año si
// no se indica período) y les asigna un puesto.
//
// datosGrupo = resultado de academicoData.service#obtenerDatosGrupo
// periodo = número de período (1..n) o null para usar el promedio general del año
const generarPlanillaClasificacionPDF = (res, datosGrupo, periodo = null) => {
  const { institucion, anioAcademico, grupo, estudiantes } = datosGrupo;
 
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
 
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="planilla-clasificacion-${grupo.nombre}${periodo ? `-p${periodo}` : '-final'}.pdf"`
  );
  doc.pipe(res);
 
  const tituloPeriodo = periodo ? `Período ${periodo}` : 'Promedio Final del Año';
 
  dibujarEncabezadoReporte(doc, institucion, 'Planilla de Clasificación', [
    `Grupo: ${grupo.nombre}  —  Grado: ${grupo.grado}  —  Año académico: ${anioAcademico.anio}`,
    `Alcance: ${tituloPeriodo}`
  ]);
 
  // Promedio a usar según el alcance solicitado, y reordenar/re-puestar
  // localmente (el puesto que trae datosGrupo siempre es el del año completo).
  const conPromedioAmbito = estudiantes.map((est) => ({
    nombreCompleto: est.nombreCompleto,
    documento: est.documento,
    promedio: periodo ? (est.promediosPorPeriodo[periodo] ?? null) : est.promedioGeneral
  }));
 
  const ordenados = [...conPromedioAmbito].sort((a, b) => (b.promedio ?? -1) - (a.promedio ?? -1));
 
  let puestoActual = 0;
  let promedioAnterior = null;
  ordenados.forEach((est, idx) => {
    if (est.promedio === null) {
      est.puesto = '-';
      return;
    }
    if (est.promedio !== promedioAnterior) {
      puestoActual = idx + 1;
      promedioAnterior = est.promedio;
    }
    est.puesto = puestoActual;
  });
 
  const filas = ordenados.map((est) => [
    est.puesto,
    est.documento,
    est.nombreCompleto,
    est.promedio != null ? est.promedio.toFixed(2) : '-'
  ]);
 
  dibujarTabla(doc, {
    columnas: [
      { header: 'Puesto', width: 50, align: 'center' },
      { header: 'Documento', width: 100 },
      { header: 'Estudiante', width: 265 },
      { header: 'Promedio', width: 100, align: 'center' }
    ],
    filas
  });
 
  piePagina(doc);
  doc.end();
};
 
module.exports = { generarPlanillaClasificacionPDF };
 