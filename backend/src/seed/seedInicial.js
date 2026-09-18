// Script de arranque único del sistema (ver PLAN_MIGRACION, sección 14).
// Crea la primera Dirección de Núcleo y su usuario administrador
// (tipoPerfil: 'dirNucleo'). A partir de ahí, todo lo demás se gestiona
// desde la aplicación.
//
// Uso:
//   node src/seed/seedInicial.js
//
// Variables de entorno requeridas (además de MONGODB_URI en .env):
//   NUCLEO_NOMBRE, NUCLEO_CODIGO, NUCLEO_MUNICIPIO, NUCLEO_DEPARTAMENTO
//   ADMIN_NOMBRES, ADMIN_APELLIDOS, ADMIN_EMAIL, ADMIN_USUARIO, ADMIN_PASSWORD

require('dotenv').config();
const mongoose = require('mongoose');
const DireccionNucleo = require('../models/DireccionNucleo');
const Usuario = require('../models/Usuario');

const camposRequeridos = [
  'NUCLEO_NOMBRE',
  'ADMIN_NOMBRES',
  'ADMIN_APELLIDOS',
  'ADMIN_EMAIL',
  'ADMIN_USUARIO',
  'ADMIN_PASSWORD'
];

const ejecutarSeed = async () => {
  const faltantes = camposRequeridos.filter((campo) => !process.env[campo]);
  if (faltantes.length > 0) {
    console.error(`[ERROR] Faltan variables de entorno: ${faltantes.join(', ')}`);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[OK] Conectado a MongoDB');

  try {
    let nucleo = await DireccionNucleo.findOne({ nombre: process.env.NUCLEO_NOMBRE });

    if (nucleo) {
      console.log(`[INFO] La Dirección de Núcleo "${nucleo.nombre}" ya existe, no se duplica.`);
    } else {
      nucleo = await DireccionNucleo.create({
        nombre: process.env.NUCLEO_NOMBRE,
        codigo: process.env.NUCLEO_CODIGO,
        municipio: process.env.NUCLEO_MUNICIPIO,
        departamento: process.env.NUCLEO_DEPARTAMENTO
      });
      console.log(`[OK] Dirección de Núcleo creada: ${nucleo.nombre} (${nucleo._id})`);
    }

    const usuarioExistente = await Usuario.findOne({ email: process.env.ADMIN_EMAIL.toLowerCase() });

    if (usuarioExistente) {
      console.log(`[INFO] El usuario ${process.env.ADMIN_EMAIL} ya existe, no se duplica.`);
    } else {
      const admin = await Usuario.create({
        nucleoId: nucleo._id,
        institucionId: null,
        nombres: process.env.ADMIN_NOMBRES,
        apellidos: process.env.ADMIN_APELLIDOS,
        email: process.env.ADMIN_EMAIL,
        tipoPerfil: 'dirNucleo',
        credenciales: {
          usuario: process.env.ADMIN_USUARIO,
          passwordHash: process.env.ADMIN_PASSWORD, // se encripta automáticamente al guardar
          debeCambiarPassword: true
        }
      });
      console.log(`[OK] Usuario dirNucleo creado: ${admin.email} (${admin._id})`);
    }

    console.log('\n[OK] Seed inicial completado. Ya puedes iniciar sesión y crear los colegios desde la app.');
  } finally {
    await mongoose.disconnect();
  }
};

ejecutarSeed().catch((error) => {
  console.error('[ERROR] Falló el seed inicial:', error.message);
  process.exit(1);
});
