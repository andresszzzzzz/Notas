const PDFDocument = require('pdfkit');
const { ETIQUETA_ROL, dibujarEncabezado, dibujarFirmas, piePagina } = require('./helpers');

// datos = {
//   institucion, persona: { nombreCompleto, tipoDocumento, documento, rol },
//   // Solo si rol === 'estudiante':
//   academico: { grado, grupoNombre, jornada, anio },
//   // Solo si rol === 'docente' | 'admin':
//   laboral: { cargo, fechaVinculacion }
// }
const generarConstanciaPDF = (res, datos) => {
  const { institucion, persona, academico, laboral } = datos;
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="constancia-${persona.documento}.pdf"`);
  doc.pipe(res);

  const titulo = persona.rol === 'estudiante' ? 'Constancia de Estudio' : 'Constancia Laboral';
  dibujarEncabezado(doc, institucion, titulo);

  doc.font('Helvetica').fontSize(11);

  if (persona.rol === 'estudiante') {
    doc.text(
      `El (la) suscrito(a) Rector(a) de la Institución Educativa ${institucion?.nombre || ''} hace constar que ` +
      `${persona.nombreCompleto}, identificado(a) con ${persona.tipoDocumento} No. ${persona.documento}, ` +
      `se encuentra matriculado(a) en el grado ${academico?.grado ?? '-'}, grupo ${academico?.grupoNombre || '-'}, ` +
      `jornada ${academico?.jornada || '-'}, durante el año lectivo ${academico?.anio || '-'}.`,
      { align: 'justify', lineGap: 4 }
    );
  } else {
    doc.text(
      `El (la) suscrito(a) Rector(a) de la Institución Educativa ${institucion?.nombre || ''} hace constar que ` +
      `${persona.nombreCompleto}, identificado(a) con ${persona.tipoDocumento} No. ${persona.documento}, ` +
      `se encuentra vinculado(a) a esta institución educativa desempeñando el cargo de ${laboral?.cargo || ETIQUETA_ROL[persona.rol]} ` +
      `desde el ${laboral?.fechaVinculacion || '-'}.`,
      { align: 'justify', lineGap: 4 }
    );
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

module.exports = { generarConstanciaPDF };