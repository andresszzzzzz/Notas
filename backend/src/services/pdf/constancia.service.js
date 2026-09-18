const PDFDocument = require('pdfkit');
const { dibujarEncabezado, dibujarFirmas, piePagina } = require('./helpers');

const iniciarDocumento = (res, estudiante, sufijoArchivo, titulo, institucion) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${sufijoArchivo}-${estudiante.documento}.pdf"`);
  doc.pipe(res);
  dibujarEncabezado(doc, institucion, titulo);
  return doc;
};

const parrafoBase = (doc, institucion, estudiante, matricula) => {
  doc.font('Helvetica').fontSize(11);
  doc.text(
    `El (la) suscrito(a) Rector(a) de la Institución Educativa ${institucion?.nombre || ''} hace constar que ` +
    `${estudiante.nombreCompleto}, identificado(a) con ${estudiante.tipoDocumento || ''} No. ${estudiante.documento}, ` +
    `se encuentra matriculado(a) en el grado ${matricula?.grupo?.grado ?? '-'}, grupo ${matricula?.grupo?.nombre || '-'}` +
    (matricula?.jornada ? `, jornada ${matricula.jornada}` : '') +
    `, durante el año lectivo ${matricula?.anio || '-'}.`,
    { align: 'justify', lineGap: 4 }
  );
};

const cerrarConFirma = (doc, institucion, destinatario, observaciones) => {
  doc.moveDown(1);
  if (destinatario) {
    doc.text(`Se expide a solicitud de: ${destinatario}.`, { align: 'justify' });
  }
  if (observaciones) {
    doc.moveDown(0.5);
    doc.text(`Observaciones: ${observaciones}`, { align: 'justify' });
  }
  doc.moveDown(1);
  doc.text(
    'La presente se expide a solicitud del interesado(a) para los fines que estime convenientes.',
    { align: 'justify' }
  );

  doc.moveDown(2);
  doc.text(`Se firma en ${institucion?.direccion ? institucion.direccion.split(',').pop().trim() : ''}, ` +
    `a los ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}.`);

  const yFirmas = doc.y + 70;
  dibujarFirmas(doc, institucion, yFirmas);
  doc.y = yFirmas + 20;
  piePagina(doc);
  doc.end();
};

// Formato 1: constancia simple de estudio (solo confirma matrícula activa).
// datos = { institucion, estudiante: {...}, matricula: { grupo, anio, jornada }, destinatario, observaciones }
const generarConstanciaEstudioPDF = (res, datos) => {
  const { institucion, estudiante, matricula, destinatario, observaciones } = datos;
  const doc = iniciarDocumento(res, estudiante, 'constancia-estudio', 'Constancia de Estudio', institucion);
  parrafoBase(doc, institucion, estudiante, matricula);
  cerrarConFirma(doc, institucion, destinatario, observaciones);
};

// Formato 2: constancia de estudio que además incluye el resumen de notas por
// área y el resultado final del año (para trámites que exigen evidencia de rendimiento).
// datos = { ...igual que arriba..., resumenAreas: [{nombre, definitiva}], promedioGeneral, resultado }
const generarConstanciaNotasPDF = (res, datos) => {
  const { institucion, estudiante, matricula, destinatario, observaciones, resumenAreas, promedioGeneral, resultado } = datos;
  const doc = iniciarDocumento(res, estudiante, 'constancia-notas', 'Constancia de Estudio y Notas', institucion);
  parrafoBase(doc, institucion, estudiante, matricula);

  doc.moveDown(1);
  const x = doc.x;
  let y = doc.y;
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Área', x, y, { width: 350 });
  doc.text('Promedio', x + 350, y, { width: 100, align: 'center' });
  y += 16;
  doc.moveTo(x, y - 4).lineTo(x + 450, y - 4).stroke();

  doc.font('Helvetica').fontSize(10);
  (resumenAreas || []).forEach((area) => {
    doc.text(area.nombre, x, y, { width: 350 });
    doc.text(area.definitiva != null ? area.definitiva.toFixed(1) : '-', x + 350, y, { width: 100, align: 'center' });
    y += 16;
  });

  doc.moveTo(x, y).lineTo(x + 450, y).stroke();
  y += 10;
  doc.font('Helvetica-Bold').text(
    `Promedio general: ${promedioGeneral != null ? promedioGeneral.toFixed(2) : '-'}   Resultado: ${resultado || '-'}`,
    x, y
  );
  doc.y = y + 20;

  cerrarConFirma(doc, institucion, destinatario, observaciones);
};

module.exports = { generarConstanciaEstudioPDF, generarConstanciaNotasPDF };
