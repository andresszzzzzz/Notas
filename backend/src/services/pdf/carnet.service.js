const PDFDocument = require('pdfkit');
const { dibujarImagenSiExiste } = require('./helpers');

// datos = {
//   institucion, anio, etiquetaRol (texto ya resuelto, ej: "ESTUDIANTE", "DOCENTE"),
//   persona: { nombreCompleto, tipoDocumento, documento, foto, tipoSangre? },
//   lineasDatos: [ líneas de texto libres para el cuerpo del carnet ]
// }
const ANCHO_CARNET = 242; // ~8.5 cm
const ALTO_CARNET = 153;  // ~5.4 cm

const COLOR_POR_ROL = {
  ESTUDIANTE: '#1d4ed8',
  DOCENTE: '#15803d',
  ADMINISTRATIVO: '#b45309',
  RECTOR: '#7c2d12',
  COORDINADOR: '#6d28d9'
};

const generarCarnetPDF = (res, datos) => {
  const { institucion, anio, etiquetaRol, persona, lineasDatos = [] } = datos;
  const doc = new PDFDocument({ size: [ANCHO_CARNET, ALTO_CARNET], margin: 0 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="carnet-${persona.documento}.pdf"`);
  doc.pipe(res);

  const color = COLOR_POR_ROL[etiquetaRol] || '#1d4ed8';

  // --- FRENTE ---
  doc.rect(0, 0, ANCHO_CARNET, ALTO_CARNET).fill('#ffffff');
  doc.rect(0, 0, ANCHO_CARNET, 34).fill(color);

  dibujarImagenSiExiste(doc, institucion?.imagenes?.escudo, 6, 4, { width: 26, height: 26 });

  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8)
    .text(institucion?.nombre || 'Institución Educativa', 36, 6, { width: 200 });
  doc.font('Helvetica').fontSize(6.5)
    .text(`DANE: ${institucion?.dane || '-'}`, 36, 20, { width: 200 });

  const fotoOk = dibujarImagenSiExiste(doc, persona.foto, 10, 42, { width: 65, height: 78, fit: [65, 78] });
  if (!fotoOk) {
    doc.rect(10, 42, 65, 78).stroke();
    doc.fontSize(7).fillColor('#000000').text('Sin foto', 10, 75, { width: 65, align: 'center' });
  }

  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9)
    .text(persona.nombreCompleto, 82, 44, { width: 155 });

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(color)
    .text(etiquetaRol || '-', 82, 62, { width: 155 });

  doc.font('Helvetica').fontSize(7.5).fillColor('#000000');
  doc.text(`${persona.tipoDocumento || ''} ${persona.documento || '-'}`, 82, 75, { width: 155 });

  let yLinea = 88;
  lineasDatos.forEach((linea) => {
    doc.text(linea, 82, yLinea, { width: 155 });
    yLinea += 10;
  });

  if (persona.tipoSangre) {
    doc.font('Helvetica-Bold').fontSize(7).text(`RH: ${persona.tipoSangre}`, 82, yLinea, { width: 155 });
  }

  doc.rect(0, ALTO_CARNET - 16, ANCHO_CARNET, 16).fill(color);
  doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold')
    .text(`Vigencia año lectivo ${anio || '-'}`, 0, ALTO_CARNET - 13, { align: 'center', width: ANCHO_CARNET });

  // --- REVERSO ---
  doc.addPage({ size: [ANCHO_CARNET, ALTO_CARNET], margin: 0 });
  const reversoOk = dibujarImagenSiExiste(doc, institucion?.imagenes?.carnetAtras, 0, 0, {
    width: ANCHO_CARNET,
    height: ALTO_CARNET
  });

  if (!reversoOk) {
    doc.rect(0, 0, ANCHO_CARNET, ALTO_CARNET).fill('#ffffff');
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(7)
      .text('En caso de pérdida, favor comunicarse con:', 10, 14, { width: ANCHO_CARNET - 20 });
    doc.font('Helvetica').fontSize(7)
      .text(institucion?.direccion || '', 10, 26, { width: ANCHO_CARNET - 20 })
      .text(institucion?.telefono || '', 10, 38, { width: ANCHO_CARNET - 20 });

    dibujarImagenSiExiste(doc, institucion?.imagenes?.firmaRector, 60, 95, { width: 100, height: 30 });
    doc.moveTo(60, 128).lineTo(180, 128).stroke();
    doc.fontSize(6.5).text('Rector(a)', 60, 131, { width: 120, align: 'center' });
  }

  doc.end();
};

module.exports = { generarCarnetPDF };
