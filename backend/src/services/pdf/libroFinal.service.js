const PDFDocument = require('pdfkit');

// Genera el libro final de calificaciones del grupo: matriz de estudiantes x
// asignaturas con la nota definitiva de cada una, el promedio general y el
// resultado final del año.
//
// datos = {
//   institucion: { nombre, nit, dane },
//   grupo: { nombre, grado },
//   anioAcademico: { anio },
//   asignaturas: [{ id, nombre }],                // columnas, en orden
//   filasEstudiantes: [{
//     nombreCompleto, documento,
//     notasPorAsignatura: { [asignaturaId]: definitiva },
//     promedioGeneral, resultado
//   }]
// }
const generarLibroFinalPDF = (res, datos) => {
  const { institucion, grupo, anioAcademico, asignaturas, filasEstudiantes } = datos;

  const doc = new PDFDocument({ size: 'A4', margin: 30, layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="libro-final-${grupo.nombre}-${anioAcademico.anio}.pdf"`);
  doc.pipe(res);

  doc.fontSize(12).font('Helvetica-Bold').text(institucion.nombre || 'Institución Educativa');
  doc.fontSize(8).font('Helvetica').text(`NIT: ${institucion.nit || '-'}   DANE: ${institucion.dane || '-'}`);
  doc.moveDown(0.5);
  doc.fontSize(13).font('Helvetica-Bold').text(
    `LIBRO FINAL DE CALIFICACIONES — Grupo ${grupo.nombre} (Grado ${grupo.grado ?? '-'}) — Año ${anioAcademico.anio}`,
    { align: 'center' }
  );
  doc.moveDown(1);

  const inicioX = doc.page.margins.left;
  const anchoDisponible = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const anchoNombre = 150;
  const anchoRestante = anchoDisponible - anchoNombre - 90;
  const anchoAsignatura = anchoRestante / asignaturas.length;
  const anchoResultado = 90;

  let y = doc.y;

  const dibujarEncabezado = () => {
    doc.font('Helvetica-Bold').fontSize(7);
    doc.text('Estudiante', inicioX, y, { width: anchoNombre });
    asignaturas.forEach((asig, i) => {
      doc.text(asig.nombre, inicioX + anchoNombre + i * anchoAsignatura, y, {
        width: anchoAsignatura, align: 'center'
      });
    });
    doc.text('Promedio / Resultado', inicioX + anchoNombre + asignaturas.length * anchoAsignatura, y, {
      width: anchoResultado, align: 'center'
    });
    y += 22;
    doc.moveTo(inicioX, y - 4).lineTo(inicioX + anchoDisponible, y - 4).stroke();
  };

  dibujarEncabezado();
  doc.font('Helvetica').fontSize(7.5);

  filasEstudiantes.forEach((fila) => {
    const limiteVertical = doc.page.height - doc.page.margins.bottom - 30;
    if (y > limiteVertical) {
      doc.addPage();
      y = doc.y;
      dibujarEncabezado();
    }

    doc.text(`${fila.nombreCompleto}`, inicioX, y, { width: anchoNombre });
    asignaturas.forEach((asig, i) => {
      const nota = fila.notasPorAsignatura?.[asig.id];
      doc.text(nota != null ? nota.toFixed(1) : '-', inicioX + anchoNombre + i * anchoAsignatura, y, {
        width: anchoAsignatura, align: 'center'
      });
    });
    doc.font('Helvetica-Bold').text(
      `${fila.promedioGeneral != null ? fila.promedioGeneral.toFixed(2) : '-'} / ${fila.resultado || 'Pendiente'}`,
      inicioX + anchoNombre + asignaturas.length * anchoAsignatura, y, { width: anchoResultado, align: 'center' }
    );
    doc.font('Helvetica');
    y += 14;
  });

  doc.moveTo(inicioX, y).lineTo(inicioX + anchoDisponible, y).stroke();

  doc.fontSize(7).text(
    `Documento generado automáticamente el ${new Date().toLocaleDateString('es-CO')}`,
    inicioX, doc.page.height - doc.page.margins.bottom - 15, { align: 'center', width: anchoDisponible }
  );

  doc.end();
};

module.exports = { generarLibroFinalPDF };
