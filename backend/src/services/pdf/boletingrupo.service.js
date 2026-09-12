const PDFDocument = require('pdfkit');
const { dibujarCuerpoBoletin } = require('./boletin.service');
 
const generarBoletinGrupoPDF = (res, datos) => {
  const { institucion, anioAcademico, periodoInfo, grupo, estudiantes } = datos;
 
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
 
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="boletines-grupo-${grupo.nombre}-p${periodoInfo.numero}.pdf"`
  );
  doc.pipe(res);
 
  if (estudiantes.length === 0) {
    doc.fontSize(12).text('No hay estudiantes con calificaciones registradas en este período.', { align: 'center' });
  }
 
  estudiantes.forEach((item, idx) => {
    if (idx > 0) doc.addPage();
    dibujarCuerpoBoletin(doc, {
      institucion,
      anioAcademico,
      periodoInfo,
      grupo,
      estudiante: item.estudiante,
      areas: item.areas,
      promedioGeneral: item.promedioGeneral
    });
  });
 
  doc.end();
};
 
module.exports = { generarBoletinGrupoPDF };
 