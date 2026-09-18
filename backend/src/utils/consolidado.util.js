// Calcula, para un conjunto de calificaciones de TODO el año de UN estudiante,
// la nota definitiva por asignatura (promedio de períodos, usando recuperación/
// habilitación cuando reemplazan la nota original) y el resultado final del
// año según la configuración de la institución.
//
// calificaciones: documentos Calificacion con asignaturaId poblado (y asignaturaId.areaId poblado).
// configuracion: institucion.configuracion o anioAcademico.configuracion ({ notaMinima, pierdeAnoPor, numPerdidas }).
const calcularConsolidadoAnio = (calificaciones, configuracion) => {
  const notaMinima = configuracion?.notaMinima ?? 3.0;
  const pierdeAnoPor = configuracion?.pierdeAnoPor ?? 'areas';
  const numPerdidas = configuracion?.numPerdidas ?? 3;

  const asignaturasMap = new Map();

  calificaciones.forEach((cal) => {
    const asignatura = cal.asignaturaId;
    const area = asignatura?.areaId;
    const asigKey = asignatura ? String(asignatura._id) : `sin-asignatura-${cal._id}`;

    if (!asignaturasMap.has(asigKey)) {
      asignaturasMap.set(asigKey, {
        asignaturaId: asigKey,
        areaId: area ? String(area._id) : 'sin-area',
        areaNombre: area ? area.nombre : 'Sin área asignada',
        areaOrden: area?.orden ?? 999,
        asignaturaNombre: asignatura ? asignatura.nombre : 'Asignatura eliminada',
        asignaturaOrden: asignatura?.orden ?? 0,
        notasPorPeriodo: {}
      });
    }

    // La recuperación/habilitación, cuando existe y alcanza la nota mínima,
    // reemplaza la nota original del período.
    let notaFinalPeriodo = cal.nota;
    if (typeof cal.recuperacion === 'number') notaFinalPeriodo = cal.recuperacion;
    if (typeof cal.habilitacion === 'number' && cal.habilitacion >= notaMinima) notaFinalPeriodo = cal.habilitacion;

    asignaturasMap.get(asigKey).notasPorPeriodo[cal.periodo] = notaFinalPeriodo;
  });

  const filas = Array.from(asignaturasMap.values()).map((asig) => {
    const notas = Object.values(asig.notasPorPeriodo).filter((n) => typeof n === 'number');
    const definitiva = notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null;
    return { ...asig, definitiva };
  }).sort((a, b) => a.areaOrden - b.areaOrden || a.asignaturaOrden - b.asignaturaOrden);

  const notasValidas = filas.map((f) => f.definitiva).filter((n) => typeof n === 'number');
  const promedioGeneral = notasValidas.length
    ? notasValidas.reduce((s, n) => s + n, 0) / notasValidas.length
    : null;

  // Promedio por área (útil para constancias y para el conteo de pérdidas).
  const areasMap = new Map();
  filas.forEach((f) => {
    if (!areasMap.has(f.areaId)) areasMap.set(f.areaId, { nombre: f.areaNombre, orden: f.areaOrden, notas: [] });
    if (f.definitiva != null) areasMap.get(f.areaId).notas.push(f.definitiva);
  });
  const resumenAreas = Array.from(areasMap.values())
    .sort((a, b) => a.orden - b.orden)
    .map((a) => ({
      nombre: a.nombre,
      definitiva: a.notas.length ? a.notas.reduce((s, n) => s + n, 0) / a.notas.length : null
    }));

  // Conteo de "pérdidas" según si se cuenta por área o por materia individual.
  let unidadesReprobadas;
  if (pierdeAnoPor === 'materias') {
    unidadesReprobadas = filas.filter((f) => f.definitiva != null && f.definitiva < notaMinima).length;
  } else {
    unidadesReprobadas = resumenAreas.filter((a) => a.definitiva != null && a.definitiva < notaMinima).length;
  }

  const hayNotasPendientes = filas.some((f) => f.definitiva == null);
  const resultado = hayNotasPendientes
    ? 'Pendiente'
    : (unidadesReprobadas > numPerdidas ? 'Reprobó' : 'Aprobó');

  return { filas, resumenAreas, promedioGeneral, resultado, unidadesReprobadas, notaMinima, numPerdidas };
};

module.exports = { calcularConsolidadoAnio };
