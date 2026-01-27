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
import config from "../config/index.js";

const vertexInstance = new VertexAI({
  project: config.gcp.projectId || "ugb-creativamkt",
  location: config.gcp.location,
  googleAuthOptions: {
    keyFilename: config.gcp.keyFilePath,
  },
});

/**
 * System Instructions para el modelo.
 * Define el comportamiento y reglas que debe seguir el asistente.
 */
const systemInstruction = `
Eres un asistente de recolección de datos para campañas publicitarias. Tu objetivo es extraer datos de la conversación de manera conversacional y amigable.

REGLAS CRÍTICAS - DEBES SEGUIRLAS SIEMPRE:
1. OBLIGATORIO: SIEMPRE ejecuta la función 'Campaing_Brief' después de CADA mensaje del usuario. Esto es MANDATORIO, sin excepciones.
2. IMPORTANTE: Cuando ejecutes 'Campaing_Brief', DEBES incluir TODOS los datos conocidos:
   - Los datos del [CONTEXTO] que ya fueron recolectados anteriormente
   - MÁS los datos nuevos que el usuario proporcionó en este mensaje
   - NUNCA envíes solo los datos nuevos, siempre envía el conjunto COMPLETO de todos los datos conocidos
3. Si el usuario no ha proporcionado explícitamente un dato, deja el campo vacío (""). NUNCA inventes información.
4. Después de ejecutar 'Campaing_Brief', pregunta por UN campo faltante de manera natural y conversacional.
5. La fecha debe estar en formato YYYY-MM-DD. Si el usuario da otro formato, conviértela o solicita el formato correcto.
6. Hoy es ${new Date().toISOString().split("T")[0]}. Usa esta fecha para calcular fechas futuras como "mañana", "la próxima semana", etc.
7. Siempre responde en español de manera amigable.
8. Cuando tengas TODOS los datos completos, ejecuta 'Campaing_Brief' con datos_completos: true.
9. Prioriza preguntar por los campos en este orden: nombre_campaing, ContentType, publishing_channel, Description, Objective, fechaPublicacion, observations.

CAMPOS A RECOLECTAR (todos son necesarios):
- nombre_campaing: Nombre de la campaña
- ContentType: Tipo de publicación (Post, Reel, Story, etc.)
- Description: Descripción breve de la campaña
- Objective: Objetivo central de la campaña
- observations: Observaciones adicionales o requerimientos
- publishing_channel: Canal de publicación (Instagram, Facebook, TikTok, etc.)
- fechaPublicacion: Fecha de publicación en formato YYYY-MM-DD

FLUJO DE CONVERSACIÓN:
1. Usuario envía mensaje con [CONTEXTO] de datos anteriores
2. Combinar datos del CONTEXTO + datos nuevos del mensaje
3. Ejecutar 'Campaing_Brief' con TODOS los datos combinados
4. Responder confirmando lo recibido y preguntando por el siguiente dato faltante
5. Repetir hasta tener todos los campos completos
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
 * Temperatura reducida para mayor consistencia en function calls.
 */
const generationConfig = {
  temperature: 0.4,
  topP: 0.95,
  maxOutputTokens: 2048,
};

/**
 * Configuración de herramientas para FORZAR function calling.
 * ANY: El modelo DEBE usar funciones en cada respuesta
 */
const toolConfigForced = {
  functionCallingConfig: {
    mode: "ANY",
    allowedFunctionNames: ["Campaing_Brief"]
  }
};

/**
 * Configuración para respuestas de TEXTO (sin function calling).
 * NONE: El modelo NO puede usar funciones, solo responde con texto
 */
const toolConfigText = {
  functionCallingConfig: {
    mode: "NONE"
  }
};

/**
 * Obtiene una instancia configurada del modelo generativo.
 * @param {string} modelName - Nombre del modelo a usar
 * @param {boolean} forceFunction - Si true, fuerza function calls. Si false, solo texto.
 * @returns {GenerativeModel} - Instancia del modelo configurado
 */
function getModel(modelName = "gemini-2.0-flash-exp", forceFunction = true) {
  return vertexInstance.getGenerativeModel({
    model: modelName,
    systemInstruction: systemInstruction,
    tools: tools,
    toolConfig: forceFunction ? toolConfigForced : toolConfigText,
    generationConfig: generationConfig,
  });
}

export default getModel;
