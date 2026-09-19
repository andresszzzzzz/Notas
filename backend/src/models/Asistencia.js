const mongoose = require('mongoose');

const asistenciaSchema = new mongoose.Schema({
  institucionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institucion',
    required: true
  },
  anioAcademicoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AnioAcademico',
    required: true
  },
  grupoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grupo',
    required: true
  },
  // Opcional: si se registra asistencia por clase (una asignatura puntual),
  // se indica aquí. Si se deja vacío, es la asistencia general del día
  // (ej. la que toma el director de grupo en la primera hora).
  asignaturaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asignatura',
    default: null
  },
  estudianteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  docenteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  },
  fecha: {
    type: Date,
    required: true
  },
  // Igual que en Calificacion: el período académico al que pertenece esta
  // fecha, para poder filtrar/consolidar reportes por período.
  periodo: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  estado: {
    type: String,
    enum: ['presente', 'ausente', 'tarde', 'excusado'],
    required: true,
    default: 'presente'
  },
  observacion: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Evita registrar dos veces la asistencia del mismo estudiante, el mismo día,
// para la misma clase (o para la asistencia general si asignaturaId es null).
asistenciaSchema.index(
  { institucionId: 1, anioAcademicoId: 1, estudianteId: 1, fecha: 1, asignaturaId: 1 },
  { unique: true }
);
asistenciaSchema.index({ institucionId: 1, anioAcademicoId: 1, grupoId: 1, fecha: 1 });
asistenciaSchema.index({ institucionId: 1, anioAcademicoId: 1, estudianteId: 1, periodo: 1 });
asistenciaSchema.index({ institucionId: 1, anioAcademicoId: 1, docenteId: 1 });

module.exports = mongoose.model('Asistencia', asistenciaSchema);