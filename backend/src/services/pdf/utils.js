// Formatea una fecha (Date o string) al formato legible en español que usan
// los reportes en PDF. Si la fecha no es válida, devuelve un guion en vez de
// reventar la generación del documento.
const formatearFecha = (fecha) => {
  if (!fecha) return '-';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
};

module.exports = { formatearFecha };
