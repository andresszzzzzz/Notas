const Matricula = require('../../models/Matricula');
const Calificacion = require('../../models/Calificacion');
const Asignatura = require('../../models/Asignatura');
const Area = require('../../models/Area');
const Grupo = require('../../models/Grupo');
const AnioAcademico = require('../../models/AnioAcademico');
const Institucion = require('../../models/Institucion');
 
// Promedia un arreglo de notas ignorando valores nulos/indefinidos.
const promediar = (notas) => {
  const validas = notas.filter((n) => typeof n === 'number' && !Number.isNaN(n));
  if (validas.length === 0) return null;
  return validas.reduce((acc, n) => acc + n, 0) / validas.length;
};

const obtenerDatosGrupo = async (grupoId) => {
  const grupo = await Grupo.findById(grupoId).populate('sedeId', 'nombre');
  if (!grupo) {
    const error = new Error('Grupo no encontrado');
    error.status = 404;
    throw error;
  }
 
  const anioAcademico = await AnioAcademico.findById(grupo.anioAcademicoId);
  if (!anioAcademico) {
    const error = new Error('Año académico no encontrado');
    error.status = 404;
    throw error;
  }
 
  const institucion = await Institucion.findById(grupo.institucionId)
    .select('nombre nit direccion dane imagenes configuracion');
 
  const notaMinima = anioAcademico.configuracion?.notaMinima
    ?? institucion?.configuracion?.notaMinima
    ?? 3.0;
  const numPeriodos = anioAcademico.cronograma?.periodos?.length
    || anioAcademico.configuracion?.numeroPeriodos
    || 4;
 
  const matriculas = await Matricula.find({ grupoId, estado: 'activa' })
    .populate('estudianteId', 'nombres apellidos documento tipoDocumento');
 
  const estudianteIds = matriculas.map((m) => m.estudianteId?._id).filter(Boolean);
 
  const [asignaturas, areas, calificaciones] = await Promise.all([
    Asignatura.find({ institucionId: grupo.institucionId }).select('nombre areaId orden intensidadHoraria').sort({ orden: 1 }),
    Area.find({ institucionId: grupo.institucionId }).select('nombre orden').sort({ orden: 1 }),
    Calificacion.find({ grupoId, estudianteId: { $in: estudianteIds } }).select('estudianteId asignaturaId periodo nota')
  ]);
 
  const areaMap = new Map(areas.map((a) => [String(a._id), a]));
 
  // estudianteId -> asignaturaId -> { periodo: nota }
  const notasIndex = new Map();
  calificaciones.forEach((cal) => {
    const estKey = String(cal.estudianteId);
    if (!notasIndex.has(estKey)) notasIndex.set(estKey, new Map());
    const porAsignatura = notasIndex.get(estKey);
    const asigKey = String(cal.asignaturaId);
    if (!porAsignatura.has(asigKey)) porAsignatura.set(asigKey, {});
    if (typeof cal.nota === 'number') porAsignatura.get(asigKey)[cal.periodo] = cal.nota;
  });
 
  const estudiantesResultado = matriculas.map((matricula) => {
    const est = matricula.estudianteId;
    const porAsignatura = notasIndex.get(String(est?._id)) || new Map();
 
    const asignaturasResultado = asignaturas
      .map((asig) => {
        const notasPorPeriodo = porAsignatura.get(String(asig._id)) || {};
        const promedio = promediar(Object.values(notasPorPeriodo));
        return {
          asignaturaId: String(asig._id),
          nombre: asig.nombre,
          areaId: asig.areaId ? String(asig.areaId) : null,
          areaNombre: asig.areaId ? (areaMap.get(String(asig.areaId))?.nombre ?? '') : 'Sin área',
          intensidadHoraria: asig.intensidadHoraria ?? 1,
          notasPorPeriodo,
          promedio,
          perdida: promedio !== null ? promedio < notaMinima : null
        };
      })
      // Solo asignaturas con al menos una nota registrada para este estudiante.
      .filter((a) => Object.keys(a.notasPorPeriodo).length > 0);
 
    // Promedio del estudiante por período (across todas sus asignaturas).
    const promediosPorPeriodo = {};
    for (let p = 1; p <= numPeriodos; p += 1) {
      const notasPeriodo = asignaturasResultado
        .map((a) => a.notasPorPeriodo[p])
        .filter((n) => typeof n === 'number');
      promediosPorPeriodo[p] = promediar(notasPeriodo);
    }
 
    const promediosAsignaturas = asignaturasResultado.map((a) => a.promedio).filter((n) => n !== null);
    const promedioGeneral = promediosAsignaturas.length ? promediar(promediosAsignaturas) : null;
 
    return {
      matriculaId: matricula._id,
      estudianteId: est?._id,
      nombreCompleto: est ? `${est.nombres} ${est.apellidos}` : 'Estudiante eliminado',
      documento: est?.documento ?? '-',
      asignaturas: asignaturasResultado,
      promediosPorPeriodo,
      promedioGeneral
    };
  });
 
  // Puesto (ranking) por promedio general del grupo. Empates comparten puesto.
  const ordenados = [...estudiantesResultado].sort(
    (a, b) => (b.promedioGeneral ?? -1) - (a.promedioGeneral ?? -1)
  );
  let puestoActual = 0;
  let promedioAnterior = null;
  ordenados.forEach((est, idx) => {
    if (est.promedioGeneral === null) {
      est.puesto = null;
      return;
    }
    if (est.promedioGeneral !== promedioAnterior) {
      puestoActual = idx + 1;
      promedioAnterior = est.promedioGeneral;
    }
    est.puesto = puestoActual;
  });
 
  // Promedio del grupo completo, período a período.
  const promediosGrupoPorPeriodo = {};
  for (let p = 1; p <= numPeriodos; p += 1) {
    const notasDelPeriodo = estudiantesResultado
      .map((est) => est.promediosPorPeriodo[p])
      .filter((n) => typeof n === 'number');
    promediosGrupoPorPeriodo[p] = promediar(notasDelPeriodo);
  }
 
  return {
    institucion,
    anioAcademico,
    grupo,
    notaMinima,
    numPeriodos,
    asignaturasOrden: asignaturas.map((a) => ({ id: String(a._id), nombre: a.nombre })),
    estudiantes: estudiantesResultado,
    promediosGrupoPorPeriodo
  };
};
 
module.exports = { obtenerDatosGrupo, promediar };
 