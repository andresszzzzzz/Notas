// Estados posibles de un año académico
const ESTADOS_ANIO = {
  PREMATRICULA: 'prematricula',
  MATRICULA: 'matricula',
  ACTIVO: 'activo',
  FINALIZADO: 'finalizado'
};

// Estados posibles de un período académico
const ESTADOS_PERIODO = {
  ABIERTO: 'abierto',
  CERRADO: 'cerrado',
  EN_RECUPERACION: 'en_recuperacion'
};

module.exports = {
  ESTADOS_ANIO,
  ESTADOS_PERIODO
};
