import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

let genAI;

// Si existe configuración de Google Cloud Project, inicializamos usando Vertex AI (Enterprise Mode)
// Esto evita las restricciones geográficas de Google AI Studio y usa los recursos de GCP en us-central1.
if (process.env.GOOGLE_PROJECT_ID) {
  console.log("[genAiClient] Inicializando GoogleGenAI en modo Vertex AI (Enterprise)...");
  
  let authOptions = {};
  if (process.env.GOOGLE_CREDS_JSON) {
    try {
      authOptions.credentials = JSON.parse(process.env.GOOGLE_CREDS_JSON);
    } catch (e) {
      console.error("[genAiClient] Error al hacer JSON.parse de GOOGLE_CREDS_JSON:", e);
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    authOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  genAI = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_PROJECT_ID,
    location: process.env.GOOGLE_LOCATION || "us-central1",
    googleAuthOptions: authOptions,
  });
} else {
  console.log("[genAiClient] Inicializando GoogleGenAI en modo Developer (API Key)...");
  genAI = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
  });
}

export default genAI;
