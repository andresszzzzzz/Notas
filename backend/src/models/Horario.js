const mongoose = require('mongoose');

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

// Valida formato de hora "HH:MM" en 24 horas (ej. "07:00", "13:30").
const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const horarioSchema = new mongoose.Schema({
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
  asignaturaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asignatura',
    required: true
  },
  docenteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  diaSemana: {
    type: String,
    enum: DIAS_SEMANA,
    required: true
  },
  horaInicio: {
    type: String,
    required: true,
    validate: {
      validator: (v) => HORA_REGEX.test(v),
      message: (props) => `"${props.value}" no es una hora válida (formato esperado HH:MM, ej. 07:00)`
    }
  },
  horaFin: {
    type: String,
    required: true,
    validate: {
      validator: (v) => HORA_REGEX.test(v),
      message: (props) => `"${props.value}" no es una hora válida (formato esperado HH:MM, ej. 07:50)`
    }
  },
  aula: {
    type: String,
    trim: true
  },
  observacion: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// horaFin siempre debe ser posterior a horaInicio.
horarioSchema.pre('validate', function validarRangoHoras(next) {
  if (this.horaInicio && this.horaFin && HORA_REGEX.test(this.horaInicio) && HORA_REGEX.test(this.horaFin)) {
    if (this.horaFin <= this.horaInicio) {
      this.invalidate('horaFin', 'La hora de fin debe ser posterior a la hora de inicio');
    }
  }
  next();
});

horarioSchema.index({ institucionId: 1, anioAcademicoId: 1, grupoId: 1, diaSemana: 1 });
horarioSchema.index({ institucionId: 1, anioAcademicoId: 1, docenteId: 1, diaSemana: 1 });

module.exports = mongoose.model('Horario', horarioSchema);
module.exports.DIAS_SEMANA = DIAS_SEMANA;