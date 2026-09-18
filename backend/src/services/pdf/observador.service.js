const PDFDocument = require('pdfkit');
const { formatearFecha } = require('./utils');

const ETIQUETAS_TIPO = { disciplinario: 'Disciplinario', academico: 'Académico', convivencia: 'Convivencia' };
const ETIQUETAS_CATEGORIA = { positiva: 'Positiva', negativa: 'Negativa', neutra: 'Neutra' };

// Genera el informe consolidado del observador de un estudiante: todas las
// anotaciones (académicas, disciplinarias, de convivencia) con sus seguimientos.
//
// datos = {
//   institucion: { nombre, nit, dane },
//   estudiante: { nombreCompleto, documento, tipoDocumento },
//   grupo: { nombre, grado } | null,
//   registros: [{
//     tipo, categoria, gravedad, estado, fecha, descripcion, compromiso,
//     docenteNombre, seguimiento: [{ fecha, observacion, responsableNombre }]
//   }]
// }
const generarObservadorPDF = (res, datos) => {
  const { institucion, estudiante, grupo, registros } = datos;

  const doc = new PDFDocument({ size: 'letter', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="observador-${estudiante.documento || estudiante.nombreCompleto}.pdf"`);
  doc.pipe(res);

  doc.fontSize(13).font('Helvetica-Bold').text(institucion.nombre || 'Institución Educativa');
  doc.fontSize(9).font('Helvetica').text(`NIT: ${institucion.nit || '-'}   DANE: ${institucion.dane || '-'}`);
  doc.moveDown(1.5);

  doc.fontSize(15).font('Helvetica-Bold').text('OBSERVADOR DEL ESTUDIANTE', { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(10).font('Helvetica');
  doc.text(`Estudiante: ${estudiante.nombreCompleto}`);
  doc.text(`Documento: ${estudiante.tipoDocumento || ''} ${estudiante.documento || '-'}`);
  if (grupo) doc.text(`Grupo: ${grupo.nombre || '-'} (Grado ${grupo.grado ?? '-'})`);
  doc.moveDown(1.5);

  if (!registros || registros.length === 0) {
    doc.font('Helvetica-Oblique').text('Este estudiante no tiene anotaciones registradas en el observador.');
    doc.end();
    return;
  }

  const inicioX = doc.page.margins.left;
  const anchoDisponible = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  registros.forEach((registro, indice) => {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 120) {
      doc.addPage();
    }

    doc.font('Helvetica-Bold').fontSize(10).text(
      `${indice + 1}. ${ETIQUETAS_TIPO[registro.tipo] || registro.tipo} — ${ETIQUETAS_CATEGORIA[registro.categoria] || registro.categoria}`,
      inicioX
    );
    doc.font('Helvetica').fontSize(8).fillColor('#555555').text(
      `Fecha: ${formatearFecha(registro.fecha)}   |   Gravedad: ${registro.gravedad || '-'}   |   Estado: ${registro.estado || '-'}` +
      (registro.docenteNombre ? `   |   Registrado por: ${registro.docenteNombre}` : ''),
      inicioX
    );
    doc.fillColor('#000000').fontSize(9).font('Helvetica').moveDown(0.3);
    doc.text(registro.descripcion, inicioX, doc.y, { width: anchoDisponible, align: 'justify' });

    if (registro.compromiso) {
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(9).text('Compromiso: ', inicioX, doc.y, { continued: true });
      doc.font('Helvetica').text(registro.compromiso, { width: anchoDisponible });
    }

    if (registro.seguimiento && registro.seguimiento.length > 0) {
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(8.5).text('Seguimiento:', inicioX + 10);
      registro.seguimiento.forEach((s) => {
        doc.font('Helvetica').fontSize(8.5).text(
          `• ${formatearFecha(s.fecha)} — ${s.observacion}${s.responsableNombre ? ` (${s.responsableNombre})` : ''}`,
          inicioX + 15, doc.y, { width: anchoDisponible - 15 }
        );
      });
    }

    doc.moveDown(0.5);
    doc.moveTo(inicioX, doc.y).lineTo(inicioX + anchoDisponible, doc.y).strokeColor('#dddddd').stroke().strokeColor('#000000');
    doc.moveDown(0.8);
  });

  doc.fontSize(8).font('Helvetica').text(
    `Documento generado automáticamente el ${new Date().toLocaleDateString('es-CO')}`,
    { align: 'center' }
  );

  doc.end();
};

module.exports = { generarObservadorPDF };