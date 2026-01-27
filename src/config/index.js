import path from "path";
import { fileURLToPath } from "url";

/**
 * Objeto de configuración centralizado.
 * Contiene ajustes para Google Cloud Platform, Supabase y el servidor Express.
 * @typedef {Object} Config
 * @property {Object} gcp - Configuración de Google Cloud Platform.
 * @property {string} gcp.projectId - ID del proyecto en GCP.
 * @property {string} gcp.location - Región de los servicios (por defecto: us-central1).
 * @property {string} gcp.keyFilePath - Ruta absoluta al archivo de credenciales JSON.
 * @property {Object} gcp.models - Identificadores de modelos de IA en Vertex AI.
 * @property {Object} gcp.storage - Configuración de Google Cloud Storage.
 * @property {Object} supabase - Configuración de Supabase.
 * @property {string} supabase.url - URL de la instancia de Supabase.
 * @property {string} supabase.anonKey - Clave anónima pública.
 * @property {string} supabase.serviceKey - Clave de servicio (privada/admin).
 * @property {Object} server - Configuración del servidor.
 * @property {number} server.port - Puerto de escucha (por defecto: 3000).
 * @property {string} server.nodeEnv - Entorno de ejecución (development/production).
 * @property {string} server.jwtSecret - Secreto para firma de JWTs.
 */
const config = {
  gcp: {
    projectId: process.env.GOOGLE_PROJECT_ID,
    location: process.env.GOOGLE_LOCATION || "us-central1",
    keyFilePath: process.env.GOOGLE_APPLICATION_CREDENTIALS ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS) : undefined,
    models: {
      geminiPro: "gemini-2.5-pro",
      geminiFlash: "gemini-2.5-flash",
      geminiVision: "gemini-pro-vision",
      imagen2: "gemini-2.5-flash-image",
      embedingModel: "text-embedding-004",
    },
    storage: {
      bucketName: process.env.GCS_BUCKET_NAME,
      publicUrl:
        process.env.GCS_PUBLIC_URL ||
        `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}`,
    },
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || "development",
    jwtSecret: process.env.NICOLA_SECRET,
  },
};

export default config;
