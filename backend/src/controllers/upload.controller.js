const fs = require('fs');
const path = require('path');
const Usuario = require('../models/Usuario');
const Institucion = require('../models/Institucion');
const { rutaPublica, CARPETA_UPLOADS } = require('../middlewares/upload');

// Borra un archivo previo servido desde /uploads/... (si existía), ignorando errores
// si ya no está en disco.
const borrarArchivoAnterior = (rutaPublicaAnterior) => {
  if (!rutaPublicaAnterior || !rutaPublicaAnterior.startsWith('/uploads/')) return;
  const rutaAbsoluta = path.join(CARPETA_UPLOADS, rutaPublicaAnterior.replace('/uploads/', ''));
  fs.unlink(rutaAbsoluta, () => {});
};

// POST /api/uploads/usuarios/:id/foto
// El propio usuario puede subir su foto, o un admin/rector/coordinador de su institución.
const subirFotoUsuario = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ mensaje: 'Debes enviar un archivo de imagen en el campo "imagen"' });
    }

    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const esElMismoUsuario = req.usuario.id === String(usuario._id);
    const puedeGestionarPersonas = ['admin', 'rector', 'coordinador'].includes(req.usuario.tipoPerfil);
    if (!esElMismoUsuario && !puedeGestionarPersonas) {
      return res.status(403).json({ mensaje: 'No tienes permisos para actualizar la foto de este usuario' });
    }

    const fotoAnterior = usuario.foto;
    usuario.foto = rutaPublica('usuarios', req.file.filename);
    await usuario.save();

    borrarArchivoAnterior(fotoAnterior);

    res.status(200).json({ mensaje: 'Foto actualizada correctamente', foto: usuario.foto });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al subir la foto del usuario', error: error.message });
  }
};

// Campos de imagen válidos de una institución. "logo" vive en el nivel raíz,
// el resto dentro de institucion.imagenes.*
const TIPOS_IMAGEN_INSTITUCION = ['logo', 'escudo', 'firmaRector', 'firmaSecretaria', 'carnetFrente', 'carnetAtras'];

// POST /api/uploads/instituciones/:id/:tipo
// Reservado a roles administrativos (admin/rector) de la propia institución.
const subirImagenInstitucion = async (req, res) => {
  try {
    const { tipo } = req.params;

    if (!TIPOS_IMAGEN_INSTITUCION.includes(tipo)) {
      return res.status(400).json({
        mensaje: `Tipo de imagen inválido. Valores permitidos: ${TIPOS_IMAGEN_INSTITUCION.join(', ')}`
      });
    }

    if (!req.file) {
      return res.status(400).json({ mensaje: 'Debes enviar un archivo de imagen en el campo "imagen"' });
    }

    const institucion = await Institucion.findById(req.params.id);
    if (!institucion) {
      return res.status(404).json({ mensaje: 'Institución no encontrada' });
    }

    const nuevaRuta = rutaPublica('instituciones', req.file.filename);
    const rutaAnterior = tipo === 'logo' ? institucion.logo : institucion.imagenes?.[tipo];

    if (tipo === 'logo') {
      institucion.logo = nuevaRuta;
    } else {
      institucion.imagenes = institucion.imagenes || {};
      institucion.imagenes[tipo] = nuevaRuta;
    }

    await institucion.save();
    borrarArchivoAnterior(rutaAnterior);

    res.status(200).json({ mensaje: 'Imagen actualizada correctamente', tipo, ruta: nuevaRuta });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al subir la imagen de la institución', error: error.message });
  }
};

module.exports = { subirFotoUsuario, subirImagenInstitucion };
