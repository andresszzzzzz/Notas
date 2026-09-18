const PDFDocument = require('pdfkit');

// Genera el informe de evolución académica del grupo: promedio grupal por
// cada período transcurrido del año, para ver la tendencia (mejora/empeora).
//
// datos = {
//   institucion: { nombre, nit, dane },
//   grupo: { nombre, grado },
//   anioAcademico: { anio },
//   periodos: [{ numero, nombre, promedio, aprobados, reprobados, total }]
// }
const generarEvolucionGrupoPDF = (res, datos) => {
  const { institucion, grupo, anioAcademico, periodos } = datos;

  const doc = new PDFDocument({ size: 'letter', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="evolucion-${grupo.nombre}-${anioAcademico.anio}.pdf"`);
  doc.pipe(res);

  doc.fontSize(13).font('Helvetica-Bold').text(institucion.nombre || 'Institución Educativa');
  doc.fontSize(9).font('Helvetica').text(`NIT: ${institucion.nit || '-'}   DANE: ${institucion.dane || '-'}`);
  doc.moveDown(1.5);

  doc.fontSize(14).font('Helvetica-Bold').text(
    `EVOLUCIÓN ACADÉMICA DEL GRUPO — ${grupo.nombre} (Grado ${grupo.grado ?? '-'})`, { align: 'center' }
  );
  doc.fontSize(10).font('Helvetica').text(`Año académico ${anioAcademico.anio}`, { align: 'center' });
  doc.moveDown(2);

  // --- Gráfico de barras verticales: promedio grupal por período ---
  const inicioX = doc.page.margins.left;
  const anchoDisponible = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const alturaGrafico = 180;
  const yBase = doc.y + alturaGrafico;
  const anchoBarra = Math.min(70, (anchoDisponible / (periodos.length || 1)) - 20);
  const espacio = anchoDisponible / (periodos.length || 1);

  // Eje de referencia (nota mínima aprox. en 3.0 sobre escala de 5.0)
  doc.moveTo(inicioX, yBase).lineTo(inicioX + anchoDisponible, yBase).stroke();

  periodos.forEach((p, i) => {
    const alturaBarra = p.promedio != null ? (p.promedio / 5) * alturaGrafico : 0;
    const x = inicioX + i * espacio + (espacio - anchoBarra) / 2;
    const y = yBase - alturaBarra;
    doc.rect(x, y, anchoBarra, alturaBarra).fill(p.promedio != null && p.promedio >= 3 ? '#16a34a' : '#dc2626');
    doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold').text(
      p.promedio != null ? p.promedio.toFixed(2) : '-', x, y - 14, { width: anchoBarra, align: 'center' }
    );
    doc.fontSize(8).font('Helvetica').text(p.nombre || `P${p.numero}`, x - 10, yBase + 5, { width: anchoBarra + 20, align: 'center' });
  });

  // --- Tabla de detalle por período ---
  let y = yBase + 40;
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Período', inicioX, y, { width: 150 });
  doc.text('Promedio', inicioX + 150, y, { width: 100, align: 'center' });
  doc.text('Aprobados', inicioX + 250, y, { width: 100, align: 'center' });
  doc.text('Reprobados', inicioX + 350, y, { width: 100, align: 'center' });
  y += 16;
  doc.moveTo(inicioX, y - 3).lineTo(inicioX + 450, y - 3).stroke();

  doc.font('Helvetica').fontSize(9);
  periodos.forEach((p) => {
    doc.text(p.nombre || `Período ${p.numero}`, inicioX, y, { width: 150 });
    doc.text(p.promedio != null ? p.promedio.toFixed(2) : '-', inicioX + 150, y, { width: 100, align: 'center' });
    doc.text(String(p.aprobados ?? '-'), inicioX + 250, y, { width: 100, align: 'center' });
    doc.text(String(p.reprobados ?? '-'), inicioX + 350, y, { width: 100, align: 'center' });
    y += 16;
  });

  doc.fontSize(8).font('Helvetica').text(
    `Documento generado automáticamente el ${new Date().toLocaleDateString('es-CO')}`,
    inicioX, doc.page.height - doc.page.margins.bottom - 20, { align: 'center', width: anchoDisponible }
  );

  doc.end();
};

module.exports = { generarEvolucionGrupoPDF };