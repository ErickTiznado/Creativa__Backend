/**
 * ------------------------------------------------------------------
 * Archivo: app.js
 * Ubicación: app.js
 * Responsabilidad: Punto de entrada de la API. Carga entorno y monta rutas.
 *
 * Módulos montados:
 * - /auth: Autenticación de usuarios.
 * - /ai: Funcionalidades de chat y briefing con IA.
 * - /rag: Ingesta y consulta de bases de conocimiento (manuales).
 * - /test: Rutas de prueba para diagnóstico.
 *
 * Nota: El servidor escucha en el puerto definido en config o 3000 por defecto.
 * ------------------------------------------------------------------
 */

import Nicola, { Dynamo, Regulator } from "nicola-framework";
import AuthRoutes from "./src/routes/auth.routes.js";
import chatRoutes from "./src/routes/chat.routes.js";
import RagRoute from "./src/routes/rag.routes.js";
import testRoutes from "./src/routes/test.routes.js";
import CampaignsRoutes from "./src/routes/campaigns.routes.js";
import ProfileRoutes from "./src/routes/profile.routes.js";

// 1. Configuración de Entorno
// Carga las variables definidas en el archivo .env (ej. NICOLA_SECRET, SUPABASE_URL)
// Esto debe hacerse antes de inicializar cualquier componente que requiera secretos.
Regulator.load();

// Conexión a servicios externos (si aplica, p.ej. base de datos DynamoDB si se usara)
Dynamo.connect();

// 2. Inicialización del Servidor
// Se crea la instancia principal del framework Nicola (wrapper de Express).
const app = new Nicola();

/**
 * 3. Montaje de Módulos (Rutas)
 * Aquí conectamos los diferentes enrutadores al servidor principal.
 */

// Rutas de autenticación (Login, Registro, etc.)
// Base URL: http://localhost:3000/auth
app.use("/auth", AuthRoutes);

// Rutas para el módulo RAG (Retrieval-Augmented Generation)
// Maneja la subida y procesamiento de documentos.
// Base URL: http://localhost:3000/rag
app.use("/rag", RagRoute);

// Rutas para interacción con IA (Chats, Briefings)
// Base URL: http://localhost:3000/ai
app.use("/ai", chatRoutes);

// Rutas de prueba (Testing)
// Base URL: http://localhost:3000/test
app.use("/test", testRoutes);

// Rutas de campañas
// Base URL: http://localhost:3000/campaigns
app.use("/campaigns", CampaignsRoutes);

app.use("/profile", ProfileRoutes);
// 4. Ruta Base (Health Check)
// Endpoint sencillo para verificar que el servidor está encendido y respondiendo.
app.get("/", (req, res) => {
  res.json({ message: "Bienvenido a Creativa Backend API" });
});

// 5. Arranque del Servidor
// Ponemos al servidor a escuchar peticiones en el puerto 3000.
// TODO: Usar config.server.port en lugar de hardcodear 3000 si se desea flexibilidad.
app.listen(3000, () => {
  console.log("Servidor corriendo en el puerto 3000");
});
