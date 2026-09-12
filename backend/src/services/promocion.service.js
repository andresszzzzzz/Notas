const Matricula = require('../models/Matricula');
const Calificacion = require('../models/Calificacion');
const Asignatura = require('../models/Asignatura');
const Area = require('../models/Area');
const Grupo = require('../models/Grupo');
const AnioAcademico = require('../models/AnioAcademico');
const Institucion = require('../models/Institucion');
const { ESTADOS_ANIO, ESTADOS_PERIODO } = require('../config/constants');
 
// Promedia un arreglo de notas de período ignorando valores nulos/indefinidos.
// La nota de cada período ya viene con recuperación/habilitación aplicada
// (ver calificacion.controller.js), así que aquí solo se promedian períodos.
const promediar = (notas) => {
  const validas = notas.filter((n) => typeof n === 'number' && !Number.isNaN(n));
  if (validas.length === 0) return null;
  const suma = validas.reduce((acc, n) => acc + n, 0);
  return suma / validas.length;
};
 
// Calcula, para cada estudiante matriculado (activo) en el año académico dado,
// el promedio final por asignatura y por área, cuáles quedaron "perdidas"
// (por debajo de la nota mínima) y si el estudiante es promovido o no, según
// la configuración de la institución (pierdeAnoPor: 'areas' | 'materias', y
// numPerdidas: cuántas puede perder como máximo y seguir siendo promovido).
// No modifica ningún dato: es de solo lectura, útil para previsualizar antes
// de ejecutar el cierre real.
const calcularResultadosAnio = async (anioAcademicoId) => {
  const anioAcademico = await AnioAcademico.findById(anioAcademicoId);
  if (!anioAcademico) {
    const error = new Error('Año académico no encontrado');
    error.status = 404;
    throw error;
  }
 
  const institucion = await Institucion.findById(anioAcademico.institucionId).select('configuracion');
 
  const notaMinima = anioAcademico.configuracion?.notaMinima
    ?? institucion?.configuracion?.notaMinima
    ?? 3.0;
  const pierdeAnoPor = anioAcademico.configuracion?.pierdeAnoPor
    ?? institucion?.configuracion?.pierdeAnoPor
    ?? 'areas';
  const numPerdidas = anioAcademico.configuracion?.numPerdidas
    ?? institucion?.configuracion?.numPerdidas
    ?? 3;
 
  // Solo estudiantes con matrícula activa entran al cierre. Retirados o
  // trasladados durante el año no se evalúan para promoción.
  const matriculas = await Matricula.find({
    anioAcademicoId,
    estado: 'activa'
  })
    .populate('estudianteId', 'nombres apellidos documento')
    .populate('grupoId', 'nombre grado');
 
  const [asignaturas, areas, calificaciones] = await Promise.all([
    Asignatura.find({ institucionId: anioAcademico.institucionId }).select('nombre areaId intensidadHoraria'),
    Area.find({ institucionId: anioAcademico.institucionId }).select('nombre'),
    Calificacion.find({ anioAcademicoId }).select('estudianteId asignaturaId nota')
  ]);
 
  const asignaturaMap = new Map(asignaturas.map((a) => [String(a._id), a]));
  const areaMap = new Map(areas.map((a) => [String(a._id), a]));
 
  // estudianteId -> asignaturaId -> [notas por período]
  const notasPorEstudiante = new Map();
  for (const cal of calificaciones) {
    const estKey = String(cal.estudianteId);
    if (!notasPorEstudiante.has(estKey)) notasPorEstudiante.set(estKey, new Map());
    const porAsignatura = notasPorEstudiante.get(estKey);
    const asigKey = String(cal.asignaturaId);
    if (!porAsignatura.has(asigKey)) porAsignatura.set(asigKey, []);
    if (typeof cal.nota === 'number') porAsignatura.get(asigKey).push(cal.nota);
  }
 
  const resultados = matriculas.map((matricula) => {
    const estudianteId = matricula.estudianteId?._id || matricula.estudianteId;
    const porAsignatura = notasPorEstudiante.get(String(estudianteId)) || new Map();
 
    const asignaturasResultado = [];
    for (const [asigId, notas] of porAsignatura.entries()) {
      const asignatura = asignaturaMap.get(asigId);
      const promedio = promediar(notas);
      asignaturasResultado.push({
        asignaturaId: asigId,
        nombre: asignatura?.nombre ?? 'Asignatura eliminada',
        areaId: asignatura?.areaId ? String(asignatura.areaId) : null,
        intensidadHoraria: asignatura?.intensidadHoraria ?? 1,
        promedio,
        perdida: promedio !== null ? promedio < notaMinima : null
      });
    }
 
    // Promedio de área ponderado por intensidad horaria de cada asignatura.
    const acumuladoArea = new Map();
    for (const asig of asignaturasResultado) {
      if (!asig.areaId || asig.promedio === null) continue;
      if (!acumuladoArea.has(asig.areaId)) {
        acumuladoArea.set(asig.areaId, { sumaPonderada: 0, sumaHoras: 0 });
      }
      const acc = acumuladoArea.get(asig.areaId);
      acc.sumaPonderada += asig.promedio * asig.intensidadHoraria;
      acc.sumaHoras += asig.intensidadHoraria;
    }
 
    const areasResultado = [];
    for (const [areaId, acc] of acumuladoArea.entries()) {
      const promedio = acc.sumaHoras > 0 ? acc.sumaPonderada / acc.sumaHoras : null;
      areasResultado.push({
        areaId,
        nombre: areaMap.get(areaId)?.nombre ?? 'Área eliminada',
        promedio,
        perdida: promedio !== null ? promedio < notaMinima : null
      });
    }
 
    const perdidasCount = pierdeAnoPor === 'materias'
      ? asignaturasResultado.filter((a) => a.perdida).length
      : areasResultado.filter((a) => a.perdida).length;
 
    const promovido = perdidasCount <= numPerdidas;
 
    return {
      matriculaId: matricula._id,
      estudianteId,
      estudiante: matricula.estudianteId?.nombres
        ? `${matricula.estudianteId.nombres} ${matricula.estudianteId.apellidos}`
        : null,
      documento: matricula.estudianteId?.documento ?? null,
      grupoId: matricula.grupoId?._id || matricula.grupoId,
      grupo: matricula.grupoId?.nombre ?? null,
      grado: matricula.grupoId?.grado ?? null,
      asignaturas: asignaturasResultado,
      areas: areasResultado,
      criterio: pierdeAnoPor,
      perdidasCount,
      numPerdidasPermitidas: numPerdidas,
      promovido
    };
  });
 
  return {
    anioAcademicoId: anioAcademico._id,
    anio: anioAcademico.anio,
    institucionId: anioAcademico.institucionId,
    notaMinima,
    pierdeAnoPor,
    numPerdidas,
    totalEstudiantes: resultados.length,
    totalPromovidos: resultados.filter((r) => r.promovido).length,
    totalReprobados: resultados.filter((r) => !r.promovido).length,
    resultados
  };
};
 
// Ejecuta el cierre real del año académico:
//  1. Calcula los resultados (igual que calcularResultadosAnio).
//  2. Guarda en cada Matrícula si el estudiante fue promovido o no.
//  3. Marca el año académico como 'finalizado'.
//  4. (Opcional) Si se envía un mapeo de grupo actual -> grupo siguiente,
//     crea automáticamente la matrícula del siguiente año para los
//     promovidos (tipoMatricula: 'promovido'). Si un estudiante ya tenía
//     matrícula en ese grupo/año, no se duplica (upsert).
//
// opciones:
//  - forzar: boolean -> permite cerrar aunque haya períodos sin cerrar
//  - mapeoGrupos: [{ grupoActualId, grupoSiguienteId }]
const ejecutarCierreAnio = async (anioAcademicoId, opciones = {}) => {
  const { forzar = false, mapeoGrupos = [] } = opciones;
 
  const anioAcademico = await AnioAcademico.findById(anioAcademicoId);
  if (!anioAcademico) {
    const error = new Error('Año académico no encontrado');
    error.status = 404;
    throw error;
  }
 
  if (anioAcademico.estado === ESTADOS_ANIO.FINALIZADO) {
    const error = new Error('Este año académico ya fue cerrado anteriormente');
    error.status = 400;
    throw error;
  }
 
  const periodosSinCerrar = (anioAcademico.cronograma?.periodos || [])
    .filter((p) => p.estado !== ESTADOS_PERIODO.CERRADO);
 
  if (periodosSinCerrar.length > 0 && !forzar) {
    const error = new Error(
      `Hay ${periodosSinCerrar.length} período(s) que aún no están cerrados. ` +
      'Ciérralos antes de hacer el cierre de año, o envía "forzar: true" para continuar de todas formas.'
    );
    error.status = 400;
    throw error;
  }
 
  const reporte = await calcularResultadosAnio(anioAcademicoId);
 
  // 1) Guardar promovido/no promovido en cada matrícula del año que se cierra.
  await Promise.all(reporte.resultados.map((resultado) => Matricula.findByIdAndUpdate(
    resultado.matriculaId,
    {
      promovido: resultado.promovido,
      observaciones: resultado.promovido
        ? `Promovido en cierre de año (${resultado.criterio} perdidas: ${resultado.perdidasCount}/${resultado.numPerdidasPermitidas})`
        : `No promovido en cierre de año (${resultado.criterio} perdidas: ${resultado.perdidasCount}/${resultado.numPerdidasPermitidas})`
    }
  )));
 
  // 2) Marcar el año académico como cerrado.
  anioAcademico.estado = ESTADOS_ANIO.FINALIZADO;
  await anioAcademico.save();
 
  // 3) Matrícula automática al siguiente año (opcional).
  const matriculasCreadas = [];
  const errores = [];
 
  if (mapeoGrupos.length > 0) {
    const mapaSiguienteGrupo = new Map(
      mapeoGrupos.map((m) => [String(m.grupoActualId), m.grupoSiguienteId])
    );
 
    const gruposSiguientes = await Grupo.find({
      _id: { $in: mapeoGrupos.map((m) => m.grupoSiguienteId) }
    });
    const grupoInfoMap = new Map(gruposSiguientes.map((g) => [String(g._id), g]));
 
    for (const resultado of reporte.resultados) {
      if (!resultado.promovido) continue;
 
      const grupoSiguienteId = mapaSiguienteGrupo.get(String(resultado.grupoId));
      if (!grupoSiguienteId) continue;
 
      const grupoInfo = grupoInfoMap.get(String(grupoSiguienteId));
      if (!grupoInfo) {
        errores.push({ estudianteId: resultado.estudianteId, mensaje: 'Grupo siguiente no encontrado' });
        continue;
      }
 
      try {
        const matricula = await Matricula.findOneAndUpdate(
          {
            institucionId: grupoInfo.institucionId,
            anioAcademicoId: grupoInfo.anioAcademicoId,
            estudianteId: resultado.estudianteId
          },
          {
            $setOnInsert: {
              institucionId: grupoInfo.institucionId,
              anioAcademicoId: grupoInfo.anioAcademicoId,
              estudianteId: resultado.estudianteId,
              grupoId: grupoSiguienteId,
              tipoMatricula: 'promovido',
              estado: 'activa'
            }
          },
          { upsert: true, new: true }
        );
        matriculasCreadas.push(matricula._id);
      } catch (err) {
        errores.push({ estudianteId: resultado.estudianteId, mensaje: err.message });
      }
    }
  }
 
  return {
    ...reporte,
    matriculasCreadasSiguienteAnio: matriculasCreadas.length,
    errores
  };
};
 
module.exports = {
  calcularResultadosAnio,
  ejecutarCierreAnio
};