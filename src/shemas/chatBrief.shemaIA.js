/**
 * ------------------------------------------------------------------
 * Archivo: chatBrief.shemaIA.js
 * Ubicación: src/shemas/chatBrief.shemaIA.js
 * Responsabilidad: Configurar el modelo generativo de Vertex AI para el flujo de brief.
 *
 * Exporta: `getModel(modelName)` que retorna un GenerativeModel configurado.
 * Notas:
 * - Usa function declarations para estructurar la recolección de datos.
 * - Requiere variables de entorno de Google Cloud (ver docs/ENV.md).
 * ------------------------------------------------------------------
 */

import { VertexAI } from "@google-cloud/vertexai";

const vertexInstance = new VertexAI({
  project: process.env.GOOGLE_PROJECT_ID,
  location: process.env.GOOGLE_LOCATION,
  googleAuthOptions: {
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },
});

/**
 * System Instructions para el modelo.
 * Define el comportamiento y reglas que debe seguir el asistente.
 */
const systemInstruction = `
Eres un asistente de recolección de datos para campañas publicitarias. Tu objetivo es extraer datos de la conversación de manera conversacional y amigable.

REGLAS CRÍTICAS:
1. Si el usuario no ha proporcionado explícitamente un dato, NO inventes información.
2. Pregunta por los datos faltantes de manera natural, uno a la vez.
3. Cuando el usuario proporcione información nueva o completa, DEBES ejecutar la función 'Campaing_Brief' con los datos recolectados.
4. La fecha debe estar en formato YYYY-MM-DD. Si el usuario da otro formato, solicita el formato correcto.
5. Hoy es ${new Date().toISOString().split("T")[0]}. Usa esta fecha para calcular fechas futuras.
6. Siempre responde en español.
7. Cuando tengas todos los datos, ejecuta 'Campaing_Brief' con datos_completos: true.

CAMPOS A RECOLECTAR:
- nombre_campaing: Nombre de la campaña
- ContentType: Tipo de publicación (Post, Reel, Story, etc.)
- Description: Descripción breve de la campaña
- Objective: Objetivo central de la campaña
- observations: Observaciones adicionales o requerimientos
- publishing_channel: Canal de publicación (Instagram, Facebook, TikTok, etc.)
- fechaPublicacion: Fecha de publicación en formato YYYY-MM-DD
`;

/**
 * Declaración de funciones (tools) para el modelo.
 * Define la función que el modelo puede llamar para guardar datos.
 */
const tools = [
  {
    functionDeclarations: [
      {
        name: "Campaing_Brief",
        description: "Ejecuta esta función cuando el usuario proporcione información nueva sobre la campaña o cuando todos los datos estén completos. Guarda los datos de la campaña publicitaria.",
        parameters: {
          type: "object",
          properties: {
            nombre_campaing: {
              type: "string",
              description: "Nombre de la campaña publicitaria. Dejar vacío si no se conoce.",
            },
            ContentType: {
              type: "string",
              description: "Tipo de publicación: Post, Reel, Story, Video, etc. Dejar vacío si no se conoce.",
            },
            Description: {
              type: "string",
              description: "Descripción breve de lo que trata la campaña. Dejar vacío si no se conoce.",
            },
            Objective: {
              type: "string",
              description: "Objetivo central de la campaña (ej: generar ventas, reclutar, aumentar awareness). Dejar vacío si no se conoce.",
            },
            observations: {
              type: "string",
              description: "Observaciones adicionales, requerimientos especiales o detalles importantes. Dejar vacío si no se conoce.",
            },
            publishing_channel: {
              type: "string",
              description: "Canal de publicación donde se compartirá (Instagram, Facebook, TikTok, LinkedIn, etc.). Dejar vacío si no se conoce.",
            },
            fechaPublicacion: {
              type: "string",
              description: "Fecha de publicación en formato YYYY-MM-DD. Dejar vacío si no se conoce.",
            },
            datos_completos: {
              type: "boolean",
              description: "true si el usuario ha proporcionado todos los datos necesarios, false si aún faltan datos.",
            },
          },
          required: ["datos_completos"],
        },
      },
    ],
  },
];

/**
 * Configuración de generación para el modelo.
 */
const generationConfig = {
  temperature: 0.7,
  topP: 0.95,
  maxOutputTokens: 2048,
};

/**
 * Obtiene una instancia configurada del modelo generativo.
 * @param {string} modelName - Nombre del modelo a usar
 * @returns {GenerativeModel} - Instancia del modelo configurado
 */
function getModel(modelName = "gemini-2.0-flash-exp") {
  return vertexInstance.getGenerativeModel({
    model: modelName,
    systemInstruction: systemInstruction,
    tools: tools,
    generationConfig: generationConfig,
  });
}

export default getModel;
