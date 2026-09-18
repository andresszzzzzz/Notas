const PDFDocument = require('pdfkit');

// Dibuja una barra horizontal simple (sin librería de gráficos) representando
// un valor entre 0 y valorMax. Reutilizada por estadísticas y evolución.
const dibujarBarraHorizontal = (doc, x, y, anchoMax, alto, valor, valorMax, color = '#2563eb') => {
  const anchoBarra = valorMax > 0 ? Math.max(2, (valor / valorMax) * anchoMax) : 0;
  doc.rect(x, y, anchoMax, alto).stroke('#cccccc');
  doc.rect(x, y, anchoBarra, alto).fill(color);
  doc.fillColor('#000000');
};

// Genera el informe de estadísticas académicas de un grupo para un período
// (o consolidado del año si periodoLabel indica "Acumulado").
//
// datos = {
//   institucion: { nombre, nit, dane },
//   grupo: { nombre, grado },
//   anioAcademico: { anio },
//   periodoLabel: string,               // ej. "Período 2" o "Acumulado del año"
//   filasAreas: [{ nombre, promedio, aprobados, reprobados, total }],
//   promedioGrupal: number,
//   mejor: { nombreCompleto, promedio } | null,
//   peor: { nombreCompleto, promedio } | null
// }
const generarEstadisticasGrupoPDF = (res, datos) => {
  const { institucion, grupo, anioAcademico, periodoLabel, filasAreas, promedioGrupal, mejor, peor } = datos;

  const doc = new PDFDocument({ size: 'letter', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="estadisticas-${grupo.nombre}-${anioAcademico.anio}.pdf"`);
  doc.pipe(res);

  doc.fontSize(13).font('Helvetica-Bold').text(institucion.nombre || 'Institución Educativa');
  doc.fontSize(9).font('Helvetica').text(`NIT: ${institucion.nit || '-'}   DANE: ${institucion.dane || '-'}`);
  doc.moveDown(1.5);

  doc.fontSize(14).font('Helvetica-Bold').text(
    `ESTADÍSTICAS ACADÉMICAS — Grupo ${grupo.nombre} (Grado ${grupo.grado ?? '-'})`, { align: 'center' }
  );
  doc.fontSize(10).font('Helvetica').text(`${periodoLabel} — Año académico ${anioAcademico.anio}`, { align: 'center' });
  doc.moveDown(1.5);

  doc.font('Helvetica-Bold').fontSize(11).text(`Promedio general del grupo: ${promedioGrupal != null ? promedioGrupal.toFixed(2) : '-'}`);
  doc.moveDown(1);

  // --- Tabla + barra por área ---
  const inicioX = doc.page.margins.left;
  const anchoDisponible = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const anchoNombre = anchoDisponible * 0.22;
  const anchoBarra = anchoDisponible * 0.38;
  const anchoNumeros = anchoDisponible * 0.4;

  let y = doc.y;
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Área', inicioX, y, { width: anchoNombre });
  doc.text('Promedio', inicioX + anchoNombre + anchoBarra, y, { width: anchoNumeros * 0.4, align: 'center' });
  doc.text('Aprob./Reprob.', inicioX + anchoNombre + anchoBarra + anchoNumeros * 0.4, y, { width: anchoNumeros * 0.6, align: 'center' });
  y += 16;

  doc.font('Helvetica').fontSize(9);
  (filasAreas || []).forEach((area) => {
    doc.text(area.nombre, inicioX, y + 3, { width: anchoNombre });
    dibujarBarraHorizontal(doc, inicioX + anchoNombre, y, anchoBarra, 12, area.promedio || 0, 5);
    doc.text(area.promedio != null ? area.promedio.toFixed(2) : '-', inicioX + anchoNombre + anchoBarra, y + 3, {
      width: anchoNumeros * 0.4, align: 'center'
    });
    doc.text(`${area.aprobados}/${area.reprobados} (de ${area.total})`, inicioX + anchoNombre + anchoBarra + anchoNumeros * 0.4, y + 3, {
      width: anchoNumeros * 0.6, align: 'center'
    });
    y += 20;
  });

  // --- Mejor y peor promedio individual ---
  y += 15;
  doc.font('Helvetica-Bold').fontSize(10).text('Desempeño individual destacado', inicioX, y);
  y += 16;
  doc.font('Helvetica').fontSize(9);
  doc.text(
    `Mejor promedio: ${mejor ? `${mejor.nombreCompleto} — ${mejor.promedio.toFixed(2)}` : 'Sin datos'}`,
    inicioX, y
  );
  y += 14;
  doc.text(
    `Promedio más bajo: ${peor ? `${peor.nombreCompleto} — ${peor.promedio.toFixed(2)}` : 'Sin datos'}`,
    inicioX, y
  );

  doc.fontSize(8).font('Helvetica').text(
    `Documento generado automáticamente el ${new Date().toLocaleDateString('es-CO')}`,
    inicioX, doc.page.height - doc.page.margins.bottom - 20, { align: 'center', width: anchoDisponible }
  );

  doc.end();
};

module.exports = { generarEstadisticasGrupoPDF, dibujarBarraHorizontal };