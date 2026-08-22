require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const connectDB = require("./src/config/database");
const modelos = require("./src/models");
const routes = require("./src/routes");
const { manejadorErrores, rutaNoEncontrada } = require("./src/middlewares/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de seguridad y utilidad
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Límite de intentos de login para mitigar fuerza bruta
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { mensaje: "Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos." }
});
app.use("/api/auth/login", limitadorLogin);

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({
    mensaje: "Bienvenido a la API de EasyNotes",
    estado: "Servidor funcionando correctamente"
  });
});

app.use("/api", routes);

// 404 y manejo centralizado de errores (siempre al final)
app.use(rutaNoEncontrada);
app.use(manejadorErrores);

const startServer = async () => {
  try {
    await connectDB();

    console.log("\nModelos registrados:");
    Object.keys(modelos).forEach(nombreModelo => console.log(`   - ${nombreModelo}`));

    app.listen(PORT, () => {
      console.log(`\n[OK] API ejecutándose en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("[ERROR]", error.message);
    process.exit(1);
  }
};

startServer();
