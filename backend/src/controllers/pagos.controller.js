const Pagos = require('../models/Pagos');
const ConceptosContables = require('../models/ConceptosContables');
const Matricula = require('../models/Matricula');

// Obtener todos los pagos
const obtenerPagos = async (req, res) => {
  try {
    const pagos = await Pagos.find()
      .populate('institucionId')
      .populate('anioAcademicoId')
      .populate('estudianteId')
      .populate('conceptoId')
      .populate('recibidoPor');

    res.json(pagos);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Obtener un pago por ID
const obtenerPagoPorId = async (req, res) => {
  try {
    const pago = await Pagos.findById(req.params.id)
      .populate('institucionId')
      .populate('anioAcademicoId')
      .populate('estudianteId')
      .populate('conceptoId')
      .populate('recibidoPor');

    if (!pago) {
      return res.status(404).json({ mensaje: 'Pago no encontrado' });
    }

    res.json(pago);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Crear un pago
const crearPago = async (req, res) => {
  try {
    const nuevoPago = new Pagos(req.body);
    const pagoGuardado = await nuevoPago.save();

    res.status(201).json(pagoGuardado);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Actualizar un pago
const actualizarPago = async (req, res) => {
  try {
    const pagoActualizado = await Pagos.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!pagoActualizado) {
      return res.status(404).json({ mensaje: 'Pago no encontrado' });
    }

    res.json(pagoActualizado);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Eliminar un pago
const eliminarPago = async (req, res) => {
  try {
    const pagoEliminado = await Pagos.findByIdAndDelete(req.params.id);

    if (!pagoEliminado) {
      return res.status(404).json({ mensaje: 'Pago no encontrado' });
    }

    res.json({ mensaje: 'Pago eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

module.exports = {
  obtenerPagos,
  obtenerPagoPorId,
  crearPago,
  actualizarPago,
  eliminarPago,
  generarPagosMasivos,
  obtenerCartera,
  obtenerMora,
};

// POST /api/pagos/generar-masivo
// Genera automáticamente el pago de un concepto (ej: pensión de un mes) para
// todos los estudiantes con matrícula activa en un año académico (y opcionalmente
// un solo grupo). No duplica: si un estudiante ya tiene un pago de ese concepto
// con la misma fecha de vencimiento, lo salta en vez de crear uno repetido.
async function generarPagosMasivos(req, res) {
  try {
    const { institucionId, anioAcademicoId, conceptoId, fechaVencimiento, grupoId } = req.body;

    if (!institucionId || !anioAcademicoId || !conceptoId || !fechaVencimiento) {
      return res.status(400).json({
        mensaje: 'Se requiere institucionId, anioAcademicoId, conceptoId y fechaVencimiento'
      });
    }

    const concepto = await ConceptosContables.findById(conceptoId);
    if (!concepto) {
      return res.status(404).json({ mensaje: 'Concepto contable no encontrado' });
    }
    if (concepto.estado !== 'activo') {
      return res.status(400).json({ mensaje: 'El concepto contable seleccionado está inactivo' });
    }

    const filtroMatriculas = { institucionId, anioAcademicoId, estado: 'activa' };
    if (grupoId) filtroMatriculas.grupoId = grupoId;

    const matriculas = await Matricula.find(filtroMatriculas).select('estudianteId');
    if (matriculas.length === 0) {
      return res.status(404).json({ mensaje: 'No hay matrículas activas que coincidan con esos filtros' });
    }

    const vencimiento = new Date(fechaVencimiento);
    let generados = 0;
    let omitidos = 0;

    for (const matricula of matriculas) {
      const yaExiste = await Pagos.findOne({
        institucionId,
        anioAcademicoId,
        estudianteId: matricula.estudianteId,
        conceptoId,
        fechaVencimiento: vencimiento
      });

      if (yaExiste) {
        omitidos += 1;
        continue;
      }

      await Pagos.create({
        institucionId,
        anioAcademicoId,
        estudianteId: matricula.estudianteId,
        conceptoId,
        valor: concepto.valor,
        valorFinal: concepto.valor,
        fechaVencimiento: vencimiento,
        estado: 'pendiente'
      });
      generados += 1;
    }

    res.status(201).json({
      mensaje: 'Generación masiva completada',
      totalEstudiantes: matriculas.length,
      generados,
      omitidos
    });
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
}

// GET /api/pagos/reportes/cartera?institucionId=&anioAcademicoId=
// Todo lo que los estudiantes deben (pendiente o vencido), agrupado por estudiante.
async function obtenerCartera(req, res) {
  try {
    const { institucionId, anioAcademicoId } = req.query;
    if (!institucionId) {
      return res.status(400).json({ mensaje: 'institucionId es requerido' });
    }

    const filtro = { institucionId, estado: { $in: ['pendiente', 'vencido'] } };
    if (anioAcademicoId) filtro.anioAcademicoId = anioAcademicoId;

    const pagos = await Pagos.find(filtro)
      .populate('estudianteId', 'nombres apellidos documento')
      .populate('conceptoId', 'nombre')
      .sort({ fechaVencimiento: 1 });

    const porEstudiante = new Map();
    for (const pago of pagos) {
      const key = String(pago.estudianteId?._id || pago.estudianteId);
      if (!porEstudiante.has(key)) {
        porEstudiante.set(key, { estudiante: pago.estudianteId, pagos: [], totalAdeudado: 0 });
      }
      const entrada = porEstudiante.get(key);
      entrada.pagos.push(pago);
      entrada.totalAdeudado += pago.valorFinal;
    }

    const cartera = Array.from(porEstudiante.values());
    const totalGeneral = cartera.reduce((suma, e) => suma + e.totalAdeudado, 0);

    res.json({ totalEstudiantesConDeuda: cartera.length, totalGeneral, cartera });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
}

// GET /api/pagos/reportes/mora?institucionId=&anioAcademicoId=
// Pagos vencidos (fecha de vencimiento ya pasó y siguen sin pagarse). De paso,
// marca automáticamente como "vencido" los que estaban en "pendiente" pero ya
// se pasaron de fecha, para que el estado en la base quede al día.
async function obtenerMora(req, res) {
  try {
    const { institucionId, anioAcademicoId } = req.query;
    if (!institucionId) {
      return res.status(400).json({ mensaje: 'institucionId es requerido' });
    }

    const hoy = new Date();
    const filtroBase = { institucionId, fechaVencimiento: { $lt: hoy } };
    if (anioAcademicoId) filtroBase.anioAcademicoId = anioAcademicoId;

    // Poner al día el estado de los que ya vencieron y seguían como "pendiente".
    await Pagos.updateMany(
      { ...filtroBase, estado: 'pendiente' },
      { $set: { estado: 'vencido' } }
    );

    const enMora = await Pagos.find({ ...filtroBase, estado: 'vencido' })
      .populate('estudianteId', 'nombres apellidos documento')
      .populate('conceptoId', 'nombre')
      .sort({ fechaVencimiento: 1 });

    const diasDeMora = (fecha) => Math.floor((hoy - new Date(fecha)) / (1000 * 60 * 60 * 24));

    const detalle = enMora.map((pago) => ({
      pago,
      diasVencido: diasDeMora(pago.fechaVencimiento)
    }));

    res.json({
      totalEnMora: detalle.length,
      totalAdeudado: detalle.reduce((suma, d) => suma + d.pago.valorFinal, 0),
      detalle
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
}