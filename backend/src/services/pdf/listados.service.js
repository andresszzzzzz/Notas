const PDFDocument = require('pdfkit');
const { dibujarEncabezadoReporte, dibujarTabla, piePagina } = require('./helpers');
 
// Genera un listado general (roster) de los estudiantes matriculados en un
// grupo, con sus datos básicos. Es el reporte genérico de "Listados Varios".
//
// datos = {
//   institucion, anioAcademico, grupo,
//   estudiantes: [{ documento, tipoDocumento, nombres, apellidos, genero,
//                    fechaNacimiento, telefono, numeroMatricula, estado }]
// }
const generarListadoGeneralPDF = (res, datos) => {
  const { institucion, anioAcademico, grupo, estudiantes } = datos;
 
  const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
 
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="listado-general-${grupo.nombre}.pdf"`);
  doc.pipe(res);
 
  dibujarEncabezadoReporte(doc, institucion, 'Listado General de Estudiantes', [
    `Grupo: ${grupo.nombre}  —  Grado: ${grupo.grado}  —  Año académico: ${anioAcademico.anio}`,
    `Total de estudiantes: ${estudiantes.length}`
  ]);
 
  const filas = estudiantes.map((est, idx) => [
    idx + 1,
    `${est.tipoDocumento || ''} ${est.documento || '-'}`,
    `${est.apellidos || ''} ${est.nombres || ''}`.trim(),
    est.genero || '-',
    est.fechaNacimiento ? new Date(est.fechaNacimiento).toLocaleDateString('es-CO') : '-',
    est.telefono || '-',
    est.numeroMatricula || '-',
    est.estado || '-'
  ]);
 
  dibujarTabla(doc, {
    columnas: [
      { header: '#', width: 30, align: 'center' },
      { header: 'Documento', width: 100 },
      { header: 'Apellidos y Nombres', width: 200 },
      { header: 'Género', width: 60, align: 'center' },
      { header: 'F. Nacimiento', width: 80, align: 'center' },
      { header: 'Teléfono', width: 90 },
      { header: 'N° Matrícula', width: 90 },
      { header: 'Estado', width: 70, align: 'center' }
    ],
    filas,
    limiteInferior: 540
  });
 
  piePagina(doc);
  doc.end();
};
 
// Genera el listado de promovidos o reprobados de un año académico, a partir
// del reporte que produce promocionService (calcularResultadosAnio /
// ejecutarCierreAnio). "tipo" filtra: 'promovidos' | 'reprobados' | 'todos'.
const generarListadoPromocionPDF = (res, { institucion, anioAcademico, tipo, resultados }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
 
  const etiquetaTipo = { promovidos: 'Promovidos', reprobados: 'No Promovidos', todos: 'Promovidos y No Promovidos' }[tipo] || 'Resultado de Promoción';
 
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="listado-${tipo}-${anioAcademico.anio}.pdf"`);
  doc.pipe(res);
 
  const filtrados = tipo === 'todos'
    ? resultados
    : resultados.filter((r) => (tipo === 'promovidos' ? r.promovido : !r.promovido));
 
  dibujarEncabezadoReporte(doc, institucion, `Listado de ${etiquetaTipo}`, [
    `Año académico: ${anioAcademico.anio}`,
    `Total en este listado: ${filtrados.length}`
  ]);
 
  // Agrupados por grado/grupo para que quede legible como listado por curso.
  const porGrupo = new Map();
  filtrados.forEach((r) => {
    const key = r.grupo || 'Sin grupo';
    if (!porGrupo.has(key)) porGrupo.set(key, []);
    porGrupo.get(key).push(r);
  });
 
  Array.from(porGrupo.entries()).forEach(([nombreGrupo, lista], idx) => {
    if (idx > 0) doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(10).text(`Grupo: ${nombreGrupo}`, { underline: true });
 
    const filas = lista.map((r) => [
      r.documento || '-',
      r.estudiante || '-',
      r.criterio === 'materias' ? 'Materias' : 'Áreas',
      `${r.perdidasCount}/${r.numPerdidasPermitidas}`,
      r.promovido ? 'Promovido' : 'No promovido'
    ]);
 
    dibujarTabla(doc, {
      y: doc.y + 6,
      columnas: [
        { header: 'Documento', width: 100 },
        { header: 'Estudiante', width: 200 },
        { header: 'Criterio', width: 70, align: 'center' },
        { header: 'Perdidas', width: 70, align: 'center' },
        { header: 'Resultado', width: 75, align: 'center' }
      ],
      filas
    });
  });
 
  piePagina(doc);
  doc.end();
};
 
module.exports = { generarListadoGeneralPDF, generarListadoPromocionPDF };
 