const PDFDocument = require('pdfkit');

// Genera el PDF del boletín de un estudiante para UN período y lo escribe
// directamente sobre la respuesta HTTP (streaming, sin guardar en disco).
//
// datos = {
//   institucion: { nombre, nit, direccion, dane },
//   anioAcademico: { anio },
//   periodoInfo: { numero, nombre },
//   grupo: { nombre, grado },
//   estudiante: { nombreCompleto, documento, tipoDocumento },
//   areas: [
//     { nombre, asignaturas: [{ nombre, nota, observacion }] }
//   ],
//   promedioGeneral: number
// }
const generarBoletinPeriodoPDF = (res, datos) => {
  const { institucion, anioAcademico, periodoInfo, grupo, estudiante, areas, promedioGeneral } = datos;

  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="boletin-${estudiante.documento || estudiante.nombreCompleto}-p${periodoInfo.numero}.pdf"`
  );
  doc.pipe(res);

  // --- Encabezado institucional ---
  doc.fontSize(14).font('Helvetica-Bold').text(institucion.nombre || 'Institución Educativa', { align: 'center' });
  doc.fontSize(9).font('Helvetica')
    .text(`NIT: ${institucion.nit || '-'}   DANE: ${institucion.dane || '-'}`, { align: 'center' })
    .text(institucion.direccion || '', { align: 'center' });

  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold')
    .text(`Boletín de Calificaciones — ${periodoInfo.nombre || `Período ${periodoInfo.numero}`}`, { align: 'center' });
  doc.moveDown(0.5);

  // --- Datos del estudiante ---
  doc.fontSize(10).font('Helvetica');
  doc.text(`Estudiante: ${estudiante.nombreCompleto}`);
  doc.text(`Documento: ${estudiante.tipoDocumento || ''} ${estudiante.documento || '-'}`);
  doc.text(`Grupo: ${grupo.nombre || '-'} (Grado ${grupo.grado ?? '-'})`);
  doc.text(`Año académico: ${anioAcademico.anio}`);
  doc.moveDown(1);

  // --- Tabla de notas por área/asignatura ---
  const anchoCol = { asignatura: 300, nota: 100, obs: 100 };
  const inicioX = doc.x;
  let y = doc.y;

  const dibujarFilaEncabezado = () => {
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Área / Asignatura', inicioX, y, { width: anchoCol.asignatura });
    doc.text('Nota', inicioX + anchoCol.asignatura, y, { width: anchoCol.nota, align: 'center' });
    doc.text('Observación', inicioX + anchoCol.asignatura + anchoCol.nota, y, { width: anchoCol.obs });
    y += 16;
    doc.moveTo(inicioX, y - 4).lineTo(inicioX + anchoCol.asignatura + anchoCol.nota + anchoCol.obs, y - 4).stroke();
  };

  dibujarFilaEncabezado();
  doc.font('Helvetica').fontSize(9);

  areas.forEach((area) => {
    if (y > 720) {
      doc.addPage();
      y = doc.y;
      dibujarFilaEncabezado();
    }
    doc.font('Helvetica-Bold').text(area.nombre, inicioX, y, { width: anchoCol.asignatura });
    y += 14;

    area.asignaturas.forEach((asig) => {
      if (y > 720) {
        doc.addPage();
        y = doc.y;
        dibujarFilaEncabezado();
      }
      doc.font('Helvetica').text(`  ${asig.nombre}`, inicioX, y, { width: anchoCol.asignatura });
      doc.text(asig.nota != null ? asig.nota.toFixed(1) : '-', inicioX + anchoCol.asignatura, y, {
        width: anchoCol.nota,
        align: 'center'
      });
      doc.text(asig.observacion || '', inicioX + anchoCol.asignatura + anchoCol.nota, y, { width: anchoCol.obs });
      y += 14;
    });
    y += 4;
  });

  doc.moveTo(inicioX, y).lineTo(inicioX + anchoCol.asignatura + anchoCol.nota + anchoCol.obs, y).stroke();
  y += 10;

  doc.font('Helvetica-Bold').fontSize(10).text(
    `Promedio general del período: ${promedioGeneral != null ? promedioGeneral.toFixed(2) : '-'}`,
    inicioX,
    y
  );

  doc.moveDown(3);
  doc.fontSize(8).font('Helvetica').text(
    `Documento generado automáticamente el ${new Date().toLocaleDateString('es-CO')}`,
    { align: 'center' }
  );

  doc.end();
};

module.exports = { generarBoletinPeriodoPDF };
