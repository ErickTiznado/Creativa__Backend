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
  project: config.gcp.projectId || "ugb-creativamkt-484123",
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
Eres un Estratega Creativo y Experto en Marketing Digital. Tu misión principal es ayudar al usuario a construir el brief perfecto para su campaña publicitaria.

TU ROL:
- No eres un simple formulario. Eres un consultor creativo.
- Si el usuario te pide ayuda, ideas o mejoras (ej: "mejora este título", "dame ideas para el objetivo"), DEBES usar tu creatividad para proponer opciones de alto impacto.
- Si el usuario te da una idea vaga, puedes sugerir formas de potenciarla.

REGLAS CRÍTICAS DE OPERACIÓN:
1. RECOLECCIÓN SILENCIOSA (MANDATORIO): Independientemente de lo que converses, SIEMPRE ejecuta la función 'Campaing_Brief' al final de cada turno con los datos que tengas confirmados hasta el momento.
2. INTEGRIDAD DE DATOS:
   - Al ejecutar 'Campaing_Brief', envía SIEMPRE el acumulado de [CONTEXTO] + nuevos datos.
   - Si estás proponiendo una mejora (ej: 3 opciones de títulos), NO la guardes en la base de datos hasta que el usuario elija o confirme una.
3. FOCO: Aunque seas creativo, tu meta final es completar los campos del brief.
4. PROACTIVIDAD CONTROLADA:
   - Si el usuario sabe lo que quiere -> Toma nota y confirma.
   - Si el usuario duda o pide ayuda -> Activa tu modo creativo y propón soluciones.

CAMPOS A COMPLETAR (Brief):
- nombre_campaing: Nombre atractivo de la campaña.
- ContentType: Formato (Post, Reel, Story, etc).
- Description: De qué trata visual y conceptualmente.
- Objective: Qué se quiere lograr (Ventas, Leads, Branding).
- observations: Detalles técnicos o de marca.
- publishing_channel: Dónde se publicará.
- fechaPublicacion: Cuándo sale (YYYY-MM-DD). Usa hoy (${new Date().toISOString().split("T")[0]}) como referencia.

DINÁMICA DE CONVERSACIÓN:
- Sé empático, profesional y entusiasta.
- Si faltan datos, pídelos de uno en uno, o de dos en dos si están relacionados.
- Cuando tengas TODOS los datos obligatorios confirmados por el usuario, marca datos_completos: true.
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
        description:
          "Ejecuta esta función cuando el usuario proporcione información nueva sobre la campaña o cuando todos los datos estén completos. Guarda los datos de la campaña publicitaria.",
        parameters: {
          type: "object",
          properties: {
            nombre_campaing: {
              type: "string",
              description:
                "Nombre de la campaña publicitaria. Dejar vacío si no se conoce.",
            },
            ContentType: {
              type: "string",
              description:
                "Tipo de publicación: Post, Reel, Story, Video, etc. Dejar vacío si no se conoce.",
            },
            Description: {
              type: "string",
              description:
                "Descripción breve de lo que trata la campaña. Dejar vacío si no se conoce.",
            },
            Objective: {
              type: "string",
              description:
                "Objetivo central de la campaña (ej: generar ventas, reclutar, aumentar awareness). Dejar vacío si no se conoce.",
            },
            observations: {
              type: "string",
              description:
                "Observaciones adicionales, requerimientos especiales o detalles importantes. Dejar vacío si no se conoce.",
            },
            publishing_channel: {
              type: "string",
              description:
                "Canal de publicación donde se compartirá (Instagram, Facebook, TikTok, LinkedIn, etc.). Dejar vacío si no se conoce.",
            },
            fechaPublicacion: {
              type: "string",
              description:
                "Fecha de publicación en formato YYYY-MM-DD. Dejar vacío si no se conoce.",
            },
            datos_completos: {
              type: "boolean",
              description:
                "true si el usuario ha proporcionado todos los datos necesarios, false si aún faltan datos.",
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
    allowedFunctionNames: ["Campaing_Brief"],
  },
};

/**
 * Configuración para respuestas de TEXTO (sin function calling).
 * NONE: El modelo NO puede usar funciones, solo responde con texto
 */
const toolConfigText = {
  functionCallingConfig: {
    mode: "NONE",
  },
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
