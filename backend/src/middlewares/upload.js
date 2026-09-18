const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Carpeta raíz donde se guardan los archivos subidos (reemplaza el FTP externo del sistema viejo).
// Se sirve como estática en server.js bajo /uploads.
const CARPETA_UPLOADS = path.join(__dirname, '..', '..', 'uploads');

const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const TAMANO_MAXIMO_BYTES = 3 * 1024 * 1024; // 3MB, suficiente para fotos tipo carnet/escudo

const asegurarCarpeta = (carpeta) => {
  if (!fs.existsSync(carpeta)) {
    fs.mkdirSync(carpeta, { recursive: true });
  }
};

// Genera un middleware de subida de un solo archivo (campo "imagen"),
// guardado en uploads/<subcarpeta>/ con nombre único.
const crearUploader = (subcarpeta) => {
  const carpetaDestino = path.join(CARPETA_UPLOADS, subcarpeta);
  asegurarCarpeta(carpetaDestino);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, carpetaDestino),
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const nombreUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
      cb(null, nombreUnico);
    }
  });

  const filtroArchivo = (req, file, cb) => {
    if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
      return cb(new Error('Formato de imagen no permitido. Usa JPG, PNG o WEBP.'));
    }
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter: filtroArchivo,
    limits: { fileSize: TAMANO_MAXIMO_BYTES }
  });
};

// Construye la ruta pública (relativa) que se guarda en la base de datos y se sirve vía /uploads/...
const rutaPublica = (subcarpeta, nombreArchivo) => `/uploads/${subcarpeta}/${nombreArchivo}`;

module.exports = { crearUploader, rutaPublica, CARPETA_UPLOADS };
