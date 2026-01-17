/**
 * ------------------------------------------------------------------
 * Archivo: app.js
 * Ubicación: app.js
 * Responsabilidad: Punto de entrada de la API. Carga entorno y monta rutas.
 *
 * Módulos montados:
 * - /auth: autenticación
 * - /ai: chat/brief
 * - /rag: ingesta RAG (manuales)
 *
 * Nota: actualmente el servidor escucha en el puerto 3000 de forma fija.
 * ------------------------------------------------------------------
 */

import Nicola, { Dynamo, Regulator } from "nicola-framework";
import AuthRoutes from "./src/routes/AuthRoutes.js";
import chatRoutes from "./src/routes/chatRoutes.js";
import RagRoute from "./src/routes/rag.routes.js";


// 1. Configuración de Entorno
// Carga las variables definidas en el archivo .env (ej. NICOLA_SECRET, SUPABASE_URL)
// Esto debe hacerse antes de inicializar cualquier componente que requiera secretos.
Regulator.load();


Dynamo.connect();
// 2. Inicialización del Servidor
// Se crea la instancia principal del framework Nicola.
const app = new Nicola();

/**
 * 3. Montaje de Módulos (Rutas)
 * Aquí conectamos las rutas de autenticación al servidor.
 * Definimos el prefijo "/auth", por lo que las rutas quedarán accesibles como:
 * POST http://localhost:3000/auth/login
 */
app.use("/auth", AuthRoutes);
app.use("/rag", RagRoute);
// 4. Ruta Base (Health Check)
// Endpoint sencillo para verificar que el servidor está encendido y respondiendo.
app.get("/", (req, res) => {
  res.json({ message: "Bienvenido a Creativa" });
});

// 5. Arranque del Servidor
// Ponemos al servidor a escuchar peticiones en el puerto 3000.


app.use('/ai', chatRoutes)

app.listen(3000, () =>{
    console.log('Servidor corriendo en el puerto 3000')
})