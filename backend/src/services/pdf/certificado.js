const PDFDocument = require('pdfkit');
const { ETIQUETA_ROL, dibujarEncabezado, dibujarFirmas, piePagina } = require('./helpers');

// datos = {
//   institucion, persona: { nombreCompleto, tipoDocumento, documento, rol },
//   academico: { grado, grupoNombre, jornada, anio, areas: [{ nombre, promedio }], promedioGeneral },
//   laboral: { cargo, fechaVinculacion, asignaturas: [{ nombre, grupo }] }
// }
const generarCertificadoPDF = (res, datos) => {
  const { institucion, persona, academico, laboral } = datos;
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="certificado-${persona.documento}.pdf"`);
  doc.pipe(res);

  const titulo = persona.rol === 'estudiante' ? 'Certificado de Estudio' : 'Certificado Laboral';
  dibujarEncabezado(doc, institucion, titulo);

  doc.font('Helvetica').fontSize(11);
  doc.text(
    `Se certifica que ${persona.nombreCompleto}, identificado(a) con ${persona.tipoDocumento} No. ${persona.documento}, ` +
    (persona.rol === 'estudiante'
      ? `cursó/cursa el grado ${academico?.grado ?? '-'} en el grupo ${academico?.grupoNombre || '-'}, jornada ${academico?.jornada || '-'}, ` +
        `durante el año lectivo ${academico?.anio || '-'}, con la siguiente valoración:`
      : `se encuentra vinculado(a) a esta institución educativa en el cargo de ${laboral?.cargo || ETIQUETA_ROL[persona.rol]}, ` +
        `desde el ${laboral?.fechaVinculacion || '-'}, desempeñando las siguientes funciones/asignaturas:`),
    { align: 'justify', lineGap: 4 }
  );

  doc.moveDown(1);

  if (persona.rol === 'estudiante') {
    const areas = academico?.areas || [];
    if (areas.length === 0) {
      doc.font('Helvetica-Oblique').text('El (la) estudiante aún no tiene calificaciones registradas en el año lectivo actual.');
    } else {
      const x = doc.x;
      let y = doc.y;
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Área', x, y, { width: 350 });
      doc.text('Promedio', x + 350, y, { width: 100, align: 'center' });
      y += 16;
      doc.moveTo(x, y - 4).lineTo(x + 450, y - 4).stroke();

      doc.font('Helvetica').fontSize(10);
      areas.forEach((area) => {
        doc.text(area.nombre, x, y, { width: 350 });
        doc.text(area.promedio != null ? area.promedio.toFixed(1) : '-', x + 350, y, { width: 100, align: 'center' });
        y += 16;
      });

      doc.moveTo(x, y).lineTo(x + 450, y).stroke();
      y += 10;
      doc.font('Helvetica-Bold').text(
        `Promedio general: ${academico?.promedioGeneral != null ? academico.promedioGeneral.toFixed(2) : '-'}`,
        x, y
      );
      doc.y = y + 20;
    }
  } else {
    const asignaturas = laboral?.asignaturas || [];
    if (asignaturas.length === 0) {
      doc.font('Helvetica-Oblique').text('No se registran asignaturas/funciones asociadas para el año lectivo actual.');
    } else {
      asignaturas.forEach((asig) => {
        doc.font('Helvetica').text(`•  ${asig.nombre}${asig.grupo ? ` — Grupo ${asig.grupo}` : ''}`);
      });
    }
  }

  doc.moveDown(1);
  doc.font('Helvetica').fontSize(11).text(
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

module.exports = { generarCertificadoPDF };