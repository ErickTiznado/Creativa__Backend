import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import imageRoutes from "./routes/image.routes.js";
import assetRoutes from "./routes/asset.routes.js";
import assetsRoutes from "./routes/assets.routes.js";
import campaignRoutes from "./routes/campaigns.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import notificationRoutes from "./routes/notifications.routes.js";

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globales
app.use(helmet()); // Seguridad headers
app.use(cors()); // Permitir peticiones cross-origin
app.use(express.json({ limit: "50mb" })); // Parsing JSON body with increased limit
app.use(express.urlencoded({ limit: "50mb", extended: true })); // URL-encoded body
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
app.use("/assets", assetsRoutes);
app.use("/campaigns", campaignRoutes);
app.use("/profile", profileRoutes);
app.use('/ai', chatRoutes);
app.use('/notifications', notificationRoutes);


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
