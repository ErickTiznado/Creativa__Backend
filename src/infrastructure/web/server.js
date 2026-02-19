import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import imageRoutes from "./routes/image.routes.js";
import assetRoutes from "./routes/asset.routes.js";

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globales
app.use(helmet()); // Seguridad headers
app.use(cors()); // Permitir peticiones cross-origin
app.use(express.json()); // Parsing JSON body
app.use(morgan("dev")); // Logging HTTP

// Health Check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Creativa Backend (Express + Hexagonal) is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/auth", authRoutes);
app.use("/image", imageRoutes);
app.use("/asset", assetRoutes);

// Manejo de Errores Global
app.use((err, req, res, next) => {
  console.error("[Error Global]", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Iniciar Servidor (Solo si no es test)
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
    console.log(`Arquitectura Hexagonal lista en src/`);
  });
}

export default app;
