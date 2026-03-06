import { Storage } from "@google-cloud/storage";
import dotenv from "dotenv";
dotenv.config();

const storageOptions = {
  projectId: process.env.GOOGLE_PROJECT_ID,
};

// 1. Si existe la variable (Entorno Vercel), la parseamos
if (process.env.GOOGLE_CREDS_JSON) {
  storageOptions.credentials = JSON.parse(process.env.GOOGLE_CREDS_JSON);
}
// 2. Si NO existe (Entorno Local), usamos el archivo físico
else {
  console.log("⚠️ GOOGLE_CREDS_JSON no encontrada. Usando archivo local de credenciales.");
  // Ruta exacta apuntando a tu carpeta config/key
  storageOptions.keyFilename = './config/key/creativa-key.json';
}

const storage = new Storage(storageOptions);

export default storage;