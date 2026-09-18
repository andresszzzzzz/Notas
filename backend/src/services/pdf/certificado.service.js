const PDFDocument = require('pdfkit');
const { dibujarEncabezado, dibujarFirmas, piePagina } = require('./helpers');

// datos = {
//   institucion, anioAcademico: { anio },
//   estudiante: { nombreCompleto, documento, tipoDocumento },
//   grupo: { nombre, grado },
//   periodos: [{ numero, nombre }],
//   filas: [{ areaNombre, asignaturaNombre, notasPorPeriodo: {1: n, 2: n...}, definitiva }],
//   promedioGeneral, resultado
// }
// (filas/promedioGeneral/resultado vienen de utils/consolidado.util.js)
const generarCertificadoNotasPDF = (res, datos) => {
  const { institucion, anioAcademico, estudiante, grupo, periodos, filas, promedioGeneral, resultado } = datos;

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="certificado-notas-${estudiante.documento}.pdf"`);
  doc.pipe(res);

  dibujarEncabezado(doc, institucion, 'Certificado de Notas');

  doc.font('Helvetica').fontSize(10);
  doc.text(`Estudiante: ${estudiante.nombreCompleto}`);
  doc.text(`Documento: ${estudiante.tipoDocumento || ''} ${estudiante.documento || '-'}`);
  doc.text(`Grupo: ${grupo?.nombre || '-'} (Grado ${grupo?.grado ?? '-'})   Año lectivo: ${anioAcademico?.anio || '-'}`);
  doc.moveDown(1);

  // --- Tabla: área/asignatura x período + definitiva ---
  const inicioX = doc.x;
  let y = doc.y;
  const anchoAsignatura = 190;
  const anchoPeriodo = 45;
  const anchoDefinitiva = 60;

  const dibujarCabecera = () => {
    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('Área / Asignatura', inicioX, y, { width: anchoAsignatura });
    periodos.forEach((p, i) => {
      doc.text(`P${p.numero}`, inicioX + anchoAsignatura + i * anchoPeriodo, y, { width: anchoPeriodo, align: 'center' });
    });
    doc.text('Definitiva', inicioX + anchoAsignatura + periodos.length * anchoPeriodo, y, { width: anchoDefinitiva, align: 'center' });
    y += 14;
    doc.moveTo(inicioX, y - 3).lineTo(inicioX + anchoAsignatura + periodos.length * anchoPeriodo + anchoDefinitiva, y - 3).stroke();
  };

  dibujarCabecera();
  doc.font('Helvetica').fontSize(8);

  let areaActual = null;
  filas.forEach((fila) => {
    if (y > 750) {
      doc.addPage();
      y = 40;
      dibujarCabecera();
    }
    if (fila.areaNombre !== areaActual) {
      areaActual = fila.areaNombre;
      doc.font('Helvetica-Bold').text(areaActual, inicioX, y, { width: anchoAsignatura + periodos.length * anchoPeriodo + anchoDefinitiva });
      y += 12;
    }
    doc.font('Helvetica').text(`  ${fila.asignaturaNombre}`, inicioX, y, { width: anchoAsignatura });
    periodos.forEach((p, i) => {
      const nota = fila.notasPorPeriodo?.[p.numero];
      doc.text(nota != null ? nota.toFixed(1) : '-', inicioX + anchoAsignatura + i * anchoPeriodo, y, { width: anchoPeriodo, align: 'center' });
    });
    doc.font('Helvetica-Bold').text(
      fila.definitiva != null ? fila.definitiva.toFixed(1) : '-',
      inicioX + anchoAsignatura + periodos.length * anchoPeriodo, y, { width: anchoDefinitiva, align: 'center' }
    );
    doc.font('Helvetica');
    y += 13;
  });

  doc.moveTo(inicioX, y).lineTo(inicioX + anchoAsignatura + periodos.length * anchoPeriodo + anchoDefinitiva, y).stroke();
  y += 10;

  doc.font('Helvetica-Bold').fontSize(10).text(
    `Promedio general: ${promedioGeneral != null ? promedioGeneral.toFixed(2) : '-'}   Resultado: ${resultado}`,
    inicioX, y
  );
  doc.y = y + 30;

  const yFirmas = doc.y + 40;
  dibujarFirmas(doc, institucion, yFirmas);
  doc.y = yFirmas + 20;
  piePagina(doc);

  doc.end();
};

module.exports = { generarCertificadoNotasPDF };
