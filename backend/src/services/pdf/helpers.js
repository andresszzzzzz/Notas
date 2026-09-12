const fs = require('fs');
const path = require('path');
const { CARPETA_UPLOADS } = require('../../middlewares/upload');

// Convierte una ruta pública guardada en BD (ej: "/uploads/instituciones/escudo.png")
// a una ruta absoluta en disco. Devuelve null si no existe el archivo,
// para que el PDF se genere igual aunque falte una imagen (escudo, firma, foto, etc).
const rutaAbsoluta = (rutaPublicaImg) => {
  if (!rutaPublicaImg || !rutaPublicaImg.startsWith('/uploads/')) return null;
  const absoluta = path.join(CARPETA_UPLOADS, rutaPublicaImg.replace('/uploads/', ''));
  return fs.existsSync(absoluta) ? absoluta : null;
};

// Dibuja una imagen solo si existe en disco; si algo falla al renderizarla
// (formato corrupto, etc.) no se rompe la generación del documento completo.
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

// --- Encabezado institucional compartido por constancias y certificados ---
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

module.exports = {
  rutaAbsoluta,
  dibujarImagenSiExiste,
  ETIQUETA_ROL,
  dibujarEncabezado,
  dibujarFirmas,
  piePagina
};