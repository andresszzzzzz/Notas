const Usuario = require('../models/usuario');

// Listar usuarios (filtros opcionales: tipoPerfil, institucionId, estado, búsqueda por nombre/email)
const obtenerUsuarios = async (req, res) => {
  try {
    const { tipoPerfil, institucionId, estado, buscar, pagina = 1, limite = 20 } = req.query;
    const filtro = {};

    if (tipoPerfil) filtro.tipoPerfil = tipoPerfil;
    if (institucionId) filtro.institucionId = institucionId;
    if (estado) filtro.estado = estado;
    if (buscar) {
      filtro.$or = [
        { nombres: { $regex: buscar, $options: 'i' } },
        { apellidos: { $regex: buscar, $options: 'i' } },
        { email: { $regex: buscar, $options: 'i' } },
        { documento: { $regex: buscar, $options: 'i' } }
      ];
    }

    const paginaNum = Math.max(parseInt(pagina, 10) || 1, 1);
    const limiteNum = Math.min(parseInt(limite, 10) || 20, 100);

    const [usuarios, total] = await Promise.all([
      Usuario.find(filtro)
        .populate('institucionId', 'nombre')
        .sort({ apellidos: 1, nombres: 1 })
        .skip((paginaNum - 1) * limiteNum)
        .limit(limiteNum),
      Usuario.countDocuments(filtro)
    ]);

    res.status(200).json({
      usuarios,
      total,
      pagina: paginaNum,
      totalPaginas: Math.ceil(total / limiteNum)
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener usuarios', error: error.message });
  }
};

// Obtener un usuario por ID
const obtenerUsuarioPorId = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).populate('institucionId', 'nombre');

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el usuario', error: error.message });
  }
};

// Crear un usuario
const crearUsuario = async (req, res) => {
  try {
    const nuevoUsuario = new Usuario(req.body);
    await nuevoUsuario.save();

    const usuarioSinPassword = nuevoUsuario.toObject();
    delete usuarioSinPassword.credenciales;

    res.status(201).json(usuarioSinPassword);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al crear el usuario', error: error.message });
  }
};

// Actualizar datos de un usuario (no toca la contraseña; para eso existe /:id/password)
const actualizarUsuario = async (req, res) => {
  try {
    const datos = { ...req.body };
    delete datos.credenciales;

    const actualizado = await Usuario.findByIdAndUpdate(req.params.id, datos, {
      new: true,
      runValidators: true
    });

    if (!actualizado) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.status(200).json(actualizado);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al actualizar el usuario', error: error.message });
  }
};

// Desactivar usuario (soft delete)
const eliminarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { estado: 'inactivo' },
      { new: true }
    );

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.status(200).json({ mensaje: 'Usuario desactivado correctamente', usuario });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al desactivar el usuario', error: error.message });
  }
};

// Restablecer contraseña (uso administrativo)
const resetearPassword = async (req, res) => {
  try {
    const { passwordNueva } = req.body;

    if (!passwordNueva || passwordNueva.length < 6) {
      return res.status(400).json({ mensaje: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const usuario = await Usuario.findById(req.params.id).select('+credenciales.passwordHash');

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    usuario.credenciales.passwordHash = passwordNueva;
    usuario.credenciales.debeCambiarPassword = true;
    await usuario.save();

    res.status(200).json({ mensaje: 'Contraseña restablecida correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al restablecer la contraseña', error: error.message });
  }
};

// Cambiar estado activo/inactivo
const cambiarEstadoUsuario = async (req, res) => {
  try {
    const { estado } = req.body;

    if (!['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ mensaje: "El estado debe ser 'activo' o 'inactivo'" });
    }

    const usuario = await Usuario.findByIdAndUpdate(req.params.id, { estado }, { new: true });

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al cambiar el estado del usuario', error: error.message });
  }
};

module.exports = {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  resetearPassword,
  cambiarEstadoUsuario
};
