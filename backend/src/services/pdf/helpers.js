const fs = require('fs');
const path = require('path');
const { CARPETA_UPLOADS } = require('../../middlewares/upload');

const rutaAbsoluta = (rutaPublicaImg) => {
  if (!rutaPublicaImg || !rutaPublicaImg.startsWith('/uploads/')) return null;
  const absoluta = path.join(CARPETA_UPLOADS, rutaPublicaImg.replace('/uploads/', ''));
  return fs.existsSync(absoluta) ? absoluta : null;
};

const dibujarImagenSiExiste = (doc, rutaPublicaImg, x, y, opciones = {}) => {
  const ruta = rutaAbsoluta(rutaPublicaImg);
  if (!ruta) return false;
  try {
    doc.image(ruta, x, y, opciones);
    return true;
  } catch (error) {
    return false;
  }
};

// Etiquetas legibles para cada rol soportado por estos documentos.
const ETIQUETA_ROL = {
  estudiante: 'Estudiante',
  docente: 'Docente',
  admin: 'Personal Administrativo'
};


const dibujarEncabezado = (doc, institucion, tituloDocumento) => {
  dibujarImagenSiExiste(doc, institucion?.imagenes?.escudo, 40, 35, { width: 55, height: 55 });

  doc.fontSize(14).font('Helvetica-Bold')
    .text(institucion?.nombre || 'Institución Educativa', 100, 40, { align: 'center', width: 400 });
  doc.fontSize(9).font('Helvetica')
    .text(`NIT: ${institucion?.nit || '-'}   DANE: ${institucion?.dane || '-'}`, 100, 58, { align: 'center', width: 400 })
    .text(institucion?.direccion || '', 100, 70, { align: 'center', width: 400 });

  doc.moveTo(40, 100).lineTo(555, 100).stroke();

  doc.moveDown(2);
  doc.fontSize(13).font('Helvetica-Bold').text(tituloDocumento.toUpperCase(), 40, 115, { align: 'center' });
  doc.moveDown(1.5);
};

// --- Firmas institucionales compartidas por constancias y certificados ---
const dibujarFirmas = (doc, institucion, y) => {
  const colIzq = 100;
  const colDer = 340;

  dibujarImagenSiExiste(doc, institucion?.imagenes?.firmaRector, colIzq, y - 45, { width: 120, height: 40 });
  dibujarImagenSiExiste(doc, institucion?.imagenes?.firmaSecretaria, colDer, y - 45, { width: 120, height: 40 });

  doc.font('Helvetica').fontSize(9);
  doc.moveTo(colIzq, y).lineTo(colIzq + 150, y).stroke();
  doc.text('Rector(a)', colIzq, y + 5, { width: 150, align: 'center' });

  doc.moveTo(colDer, y).lineTo(colDer + 150, y).stroke();
  doc.text('Secretario(a) Académico(a)', colDer, y + 5, { width: 150, align: 'center' });
};

const piePagina = (doc) => {
  doc.moveDown(4);
  doc.fontSize(8).font('Helvetica').text(
    `Documento generado el ${new Date().toLocaleDateString('es-CO')} a través del sistema académico.`,
    40,
    doc.y,
    { align: 'center', width: 515 }
  );
};

// --- Utilidades para reportes tabulares (listados, planillas, estadísticas, etc.) ---

// Encabezado compacto para reportes de tabla (distinto del de constancias/certificados,
// que es más ceremonial). Recibe líneas de información libres (grupo, año, período, etc.)
const dibujarEncabezadoReporte = (doc, institucion, tituloReporte, lineasInfo = []) => {
  dibujarImagenSiExiste(doc, institucion?.imagenes?.escudo, 40, 30, { width: 45, height: 45 });

  doc.fontSize(12).font('Helvetica-Bold')
    .text(institucion?.nombre || 'Institución Educativa', 95, 32, { width: 420 });
  doc.fontSize(8).font('Helvetica')
    .text(`NIT: ${institucion?.nit || '-'}   DANE: ${institucion?.dane || '-'}`, 95, 48, { width: 420 });

  doc.fontSize(11).font('Helvetica-Bold')
    .text(tituloReporte.toUpperCase(), 40, 85, { align: 'center', width: 515 });

  let y = 104;
  doc.fontSize(9).font('Helvetica');
  lineasInfo.forEach((linea) => {
    doc.text(linea, 40, y, { width: 515 });
    y += 12;
  });

  doc.moveTo(40, y + 2).lineTo(555, y + 2).stroke();
  doc.y = y + 10;
  doc.x = 40;
  return doc.y;
};

const dibujarTabla = (doc, { x = 40, y, columnas, filas, limiteInferior = 780 }) => {
  let posY = y ?? doc.y;
  const anchoTotal = columnas.reduce((suma, col) => suma + col.width, 0);

  const dibujarEncabezadoTabla = () => {
    doc.font('Helvetica-Bold').fontSize(8.5);
    let posX = x;
    columnas.forEach((col) => {
      doc.text(col.header, posX, posY, { width: col.width, align: col.align || 'left' });
      posX += col.width;
    });
    posY += 15;
    doc.moveTo(x, posY - 3).lineTo(x + anchoTotal, posY - 3).stroke();
  };

  dibujarEncabezadoTabla();
  doc.font('Helvetica').fontSize(8.5);

  filas.forEach((fila) => {
    if (posY > limiteInferior) {
      doc.addPage();
      posY = 40;
      dibujarEncabezadoTabla();
      doc.font('Helvetica').fontSize(8.5);
    }
    let posX = x;
    columnas.forEach((col, i) => {
      const valor = fila[i];
      doc.text(valor === null || valor === undefined ? '-' : String(valor), posX, posY, {
        width: col.width,
        align: col.align || 'left'
      });
      posX += col.width;
    });
    posY += 14;
  });

  doc.moveTo(x, posY).lineTo(x + anchoTotal, posY).stroke();
  return posY + 10;
};

module.exports = {
  rutaAbsoluta,
  dibujarImagenSiExiste,
  ETIQUETA_ROL,
  dibujarEncabezado,
  dibujarFirmas,
  piePagina,
  dibujarEncabezadoReporte,
  dibujarTabla
};