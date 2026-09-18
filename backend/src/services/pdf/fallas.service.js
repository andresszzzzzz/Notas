const PDFDocument = require('pdfkit');

// Genera el informe de fallas académicas del grupo: para cada estudiante,
// las áreas/asignaturas que tiene reprobadas (por debajo de la nota mínima)
// hasta el momento del año académico.
//
// datos = {
//   institucion: { nombre, nit, dane },
//   grupo: { nombre, grado },
//   anioAcademico: { anio },
//   notaMinima: number,
//   filasEstudiantes: [{ nombreCompleto, documento, areasReprobadas: [{ nombre, definitiva }] }]
// }
const generarFallasPDF = (res, datos) => {
  const { institucion, grupo, anioAcademico, notaMinima, filasEstudiantes } = datos;

  const doc = new PDFDocument({ size: 'letter', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="fallas-${grupo.nombre}-${anioAcademico.anio}.pdf"`);
  doc.pipe(res);

  doc.fontSize(13).font('Helvetica-Bold').text(institucion.nombre || 'Institución Educativa');
  doc.fontSize(9).font('Helvetica').text(`NIT: ${institucion.nit || '-'}   DANE: ${institucion.dane || '-'}`);
  doc.moveDown(1.5);

  doc.fontSize(14).font('Helvetica-Bold').text(
    `INFORME DE FALLAS ACADÉMICAS — Grupo ${grupo.nombre} (Grado ${grupo.grado ?? '-'})`, { align: 'center' }
  );
  doc.fontSize(10).font('Helvetica').text(
    `Año académico ${anioAcademico.anio}   |   Nota mínima para aprobar: ${notaMinima.toFixed(1)}`,
    { align: 'center' }
  );
  doc.moveDown(1.5);

  const inicioX = doc.page.margins.left;
  const anchoDisponible = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const conFallas = filasEstudiantes.filter((f) => f.areasReprobadas.length > 0);

  if (conFallas.length === 0) {
    doc.font('Helvetica-Oblique').fontSize(11).text(
      'Ningún estudiante del grupo tiene áreas o asignaturas reprobadas hasta el momento.',
      { align: 'center' }
    );
    doc.end();
    return;
  }

  conFallas.forEach((fila, indice) => {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 80) doc.addPage();

    doc.font('Helvetica-Bold').fontSize(10).text(
      `${indice + 1}. ${fila.nombreCompleto} (${fila.documento || '-'})`, inicioX
    );
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#dc2626').text(
      `  ${fila.areasReprobadas.length} área(s)/asignatura(s) reprobada(s):`, inicioX + 10
    );
    doc.fillColor('#000000').font('Helvetica').fontSize(9);
    fila.areasReprobadas.forEach((area) => {
      doc.text(`     • ${area.nombre} — ${area.definitiva.toFixed(1)}`, inicioX + 10, doc.y, { width: anchoDisponible - 10 });
    });
    doc.moveDown(0.6);
  });

  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(10).text(
    `Total de estudiantes con fallas: ${conFallas.length} de ${filasEstudiantes.length}`,
    inicioX
  );

  doc.fontSize(8).font('Helvetica').text(
    `Documento generado automáticamente el ${new Date().toLocaleDateString('es-CO')}`,
    { align: 'center' }
  );

  doc.end();
};

module.exports = { generarFallasPDF };
