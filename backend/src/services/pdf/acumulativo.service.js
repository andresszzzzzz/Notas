const PDFDocument = require('pdfkit');

// Genera el informe acumulativo del grupo: por cada estudiante, su promedio
// general en cada período transcurrido y el acumulado del año hasta la fecha.
//
// datos = {
//   institucion: { nombre, nit, dane },
//   grupo: { nombre, grado },
//   anioAcademico: { anio },
//   periodos: [{ numero, nombre }],
//   filasEstudiantes: [{ nombreCompleto, documento, promediosPorPeriodo: { numero: valor }, acumulado }]
// }
const generarAcumulativoGrupoPDF = (res, datos) => {
  const { institucion, grupo, anioAcademico, periodos, filasEstudiantes } = datos;

  const doc = new PDFDocument({ size: 'A4', margin: 40, layout: periodos.length > 3 ? 'landscape' : 'portrait' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="acumulativo-${grupo.nombre}-${anioAcademico.anio}.pdf"`);
  doc.pipe(res);

  doc.fontSize(12).font('Helvetica-Bold').text(institucion.nombre || 'Institución Educativa');
  doc.fontSize(8).font('Helvetica').text(`NIT: ${institucion.nit || '-'}   DANE: ${institucion.dane || '-'}`);
  doc.moveDown(1);
  doc.fontSize(13).font('Helvetica-Bold').text(
    `INFORME ACUMULATIVO — Grupo ${grupo.nombre} (Grado ${grupo.grado ?? '-'}) — Año ${anioAcademico.anio}`,
    { align: 'center' }
  );
  doc.moveDown(1);

  const inicioX = doc.page.margins.left;
  const anchoDisponible = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const anchoNombre = anchoDisponible * 0.4;
  const anchoColPeriodo = (anchoDisponible * 0.4) / periodos.length;
  const anchoAcumulado = anchoDisponible * 0.2;

  let y = doc.y;

  const dibujarEncabezado = () => {
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Estudiante', inicioX, y, { width: anchoNombre });
    periodos.forEach((p, i) => {
      doc.text(p.nombre || `P${p.numero}`, inicioX + anchoNombre + i * anchoColPeriodo, y, {
        width: anchoColPeriodo, align: 'center'
      });
    });
    doc.text('Acumulado', inicioX + anchoNombre + periodos.length * anchoColPeriodo, y, {
      width: anchoAcumulado, align: 'center'
    });
    y += 16;
    doc.moveTo(inicioX, y - 4).lineTo(inicioX + anchoDisponible, y - 4).stroke();
  };

  dibujarEncabezado();
  doc.font('Helvetica').fontSize(9);

  filasEstudiantes.forEach((fila) => {
    const limiteVertical = doc.page.height - doc.page.margins.bottom - 40;
    if (y > limiteVertical) {
      doc.addPage();
      y = doc.y;
      dibujarEncabezado();
    }

    doc.text(`${fila.nombreCompleto} (${fila.documento || '-'})`, inicioX, y, { width: anchoNombre });
    periodos.forEach((p, i) => {
      const valor = fila.promediosPorPeriodo?.[p.numero];
      doc.text(valor != null ? valor.toFixed(1) : '-', inicioX + anchoNombre + i * anchoColPeriodo, y, {
        width: anchoColPeriodo, align: 'center'
      });
    });
    doc.font('Helvetica-Bold').text(
      fila.acumulado != null ? fila.acumulado.toFixed(2) : '-',
      inicioX + anchoNombre + periodos.length * anchoColPeriodo, y, { width: anchoAcumulado, align: 'center' }
    );
    doc.font('Helvetica');
    y += 16;
  });

  doc.moveTo(inicioX, y).lineTo(inicioX + anchoDisponible, y).stroke();

  doc.fontSize(7).font('Helvetica').text(
    `Documento generado automáticamente el ${new Date().toLocaleDateString('es-CO')}`,
    inicioX, doc.page.height - doc.page.margins.bottom - 15, { align: 'center', width: anchoDisponible }
  );

  doc.end();
};

module.exports = { generarAcumulativoGrupoPDF };