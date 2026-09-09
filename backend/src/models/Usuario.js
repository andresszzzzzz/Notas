const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// tipoPerfil: roles del sistema (ver PLAN_MIGRACION, sección 1.2)
const ROLES = ['estudiante', 'docente', 'acudiente', 'admin', 'rector', 'coordinador', 'dirNucleo'];

const relacionEstudianteSchema = new mongoose.Schema({
  acudienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  parentesco: {
    type: String,
    trim: true
  }
}, { _id: false });

const relacionAcudienteSchema = new mongoose.Schema({
  estudianteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  parentesco: {
    type: String,
    trim: true
  },
  nombre: {
    type: String,
    trim: true
  }
}, { _id: false });

const usuarioSchema = new mongoose.Schema({
  // Nula únicamente para el rol dirNucleo, que no pertenece a un colegio.
  institucionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institucion',
    default: null
  },
  // Solo se usa cuando tipoPerfil = 'dirNucleo'.
  nucleoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DireccionNucleo',
    default: null
  },
  tipoDocumento: {
    type: String,
    enum: ['CC', 'TI', 'CE', 'RC', 'PA'],
    default: 'CC'
  },
  documento: {
    type: String,
    trim: true
  },
  nombres: {
    type: String,
    required: true,
    trim: true
  },
  apellidos: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  telefono: {
    type: String,
    trim: true
  },
  direccion: {
    type: String,
    trim: true
  },
  fechaNacimiento: {
    type: Date
  },
  lugarNacimiento: {
    type: String,
    trim: true
  },
  genero: {
    type: String,
    enum: ['M', 'F', 'Otro'],
  },
  foto: {
    type: String
  },
  tipoPerfil: {
    type: String,
    enum: ROLES,
    required: true
  },
  // Solo aplica cuando tipoPerfil = 'estudiante'.
  acudientes: [relacionEstudianteSchema],
  // Solo aplica cuando tipoPerfil = 'acudiente'.
  estudiantes: [relacionAcudienteSchema],
  credenciales: {
    usuario: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    debeCambiarPassword: {
      type: Boolean,
      default: true
    },
    ultimoLogin: {
      type: Date
    }
  },
  estado: {
    type: String,
    enum: ['activo', 'inactivo'],
    default: 'activo'
  }
}, {
  timestamps: true
});

usuarioSchema.virtual('nombreCompleto').get(function () {
  return `${this.nombres} ${this.apellidos}`.trim();
});
usuarioSchema.set('toJSON', { virtuals: true });
usuarioSchema.set('toObject', { virtuals: true });

// Únicos, pero permitiendo null en institucionId (rol dirNucleo).
usuarioSchema.index(
  { institucionId: 1, documento: 1 },
  { unique: true, partialFilterExpression: { documento: { $type: 'string' } } }
);
usuarioSchema.index({ institucionId: 1, 'credenciales.usuario': 1 }, { unique: true, sparse: true });
usuarioSchema.index({ nucleoId: 1, 'credenciales.usuario': 1 }, { unique: true, sparse: true });
usuarioSchema.index({ institucionId: 1, tipoPerfil: 1 });

// Si llega una contraseña en texto plano en credenciales.passwordHash, se
// encripta automáticamente antes de guardar.
usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('credenciales.passwordHash')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.credenciales.passwordHash = await bcrypt.hash(this.credenciales.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

usuarioSchema.methods.compararPassword = function (passwordPlano) {
  return bcrypt.compare(passwordPlano, this.credenciales.passwordHash);
};

module.exports = mongoose.model('Usuario', usuarioSchema);
