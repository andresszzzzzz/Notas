// Middleware de manejo centralizado de errores. Debe registrarse siempre
// AL FINAL, después de todas las rutas.
const manejadorErrores = (err, req, res, next) => {
  console.error('[ERROR]', err.stack || err.message);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ mensaje: 'Error de validación', error: err.message });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ mensaje: 'Identificador inválido', error: err.message });
  }

  res.status(err.status || 500).json({
    mensaje: err.mensaje || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
};

// Middleware para rutas no encontradas (404). Se registra después de las rutas
// y antes del manejador de errores.
const rutaNoEncontrada = (req, res) => {
  res.status(404).json({ mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
};

module.exports = { manejadorErrores, rutaNoEncontrada };
