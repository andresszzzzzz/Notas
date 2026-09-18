const PDFDocument = require('pdfkit');

// Genera el listado de promovidos, no promovidos y pendientes de un año
// académico (opcionalmente filtrado a un solo grupo).
//
// datos = {
//   institucion: { nombre, nit, dane },
//   anioAcademico: { anio },
//   grupoLabel: string | null,   // ej. "Grupo 9A" o null si es de toda la institución
//   promovidos: [{ nombreCompleto, documento, grupo, promedio }],
//   noPromovidos: [{ nombreCompleto, documento, grupo, promedio }],
//   pendientes: [{ nombreCompleto, documento, grupo }]
// }
const generarPromovidosPDF = (res, datos) => {
  const { institucion, anioAcademico, grupoLabel, promovidos, noPromovidos, pendientes } = datos;

  const doc = new PDFDocument({ size: 'letter', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="promovidos-${anioAcademico.anio}.pdf"`);
  doc.pipe(res);

  doc.fontSize(13).font('Helvetica-Bold').text(institucion.nombre || 'Institución Educativa');
  doc.fontSize(9).font('Helvetica').text(`NIT: ${institucion.nit || '-'}   DANE: ${institucion.dane || '-'}`);
  doc.moveDown(1.5);

  doc.fontSize(14).font('Helvetica-Bold').text('LISTADO DE PROMOCIÓN', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(
    `Año académico ${anioAcademico.anio}${grupoLabel ? ` — ${grupoLabel}` : ' — Todos los grupos'}`,
    { align: 'center' }
  );
  doc.moveDown(1.5);

  const inicioX = doc.page.margins.left;
  const anchoDisponible = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const dibujarSeccion = (titulo, lista, mostrarPromedio) => {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 100) doc.addPage();

    doc.font('Helvetica-Bold').fontSize(11).text(`${titulo} (${lista.length})`, inicioX);
    doc.moveDown(0.3);

    if (lista.length === 0) {
      doc.font('Helvetica-Oblique').fontSize(9).text('Sin registros.', inicioX);
      doc.moveDown(1);
      return;
    }

    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('Estudiante', inicioX, doc.y, { width: 220, continued: true });
    doc.text('Documento', inicioX + 220, doc.y, { width: 100, continued: true });
    doc.text('Grupo', inicioX + 320, doc.y, { width: 100, continued: mostrarPromedio });
    if (mostrarPromedio) doc.text('Promedio', inicioX + 420, doc.y, { width: 80, align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(inicioX, doc.y).lineTo(inicioX + anchoDisponible, doc.y).stroke();
    doc.moveDown(0.2);

    doc.font('Helvetica').fontSize(8);
    lista.forEach((est) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
      }
      doc.text(est.nombreCompleto, inicioX, doc.y, { width: 220, continued: true });
      doc.text(est.documento || '-', inicioX + 220, doc.y, { width: 100, continued: true });
      doc.text(est.grupo || '-', inicioX + 320, doc.y, { width: 100, continued: mostrarPromedio });
      if (mostrarPromedio) {
        doc.text(est.promedio != null ? est.promedio.toFixed(2) : '-', inicioX + 420, doc.y, { width: 80, align: 'center' });
      }
      doc.moveDown(0.3);
    });
    doc.moveDown(1);
  };

  dibujarSeccion('Promovidos', promovidos || [], true);
  dibujarSeccion('No promovidos', noPromovidos || [], true);
  dibujarSeccion('Pendientes (notas incompletas)', pendientes || [], false);

  doc.fontSize(8).font('Helvetica').text(
    `Documento generado automáticamente el ${new Date().toLocaleDateString('es-CO')}`,
    { align: 'center' }
  );

  doc.end();
};

module.exports = { generarPromovidosPDF };
