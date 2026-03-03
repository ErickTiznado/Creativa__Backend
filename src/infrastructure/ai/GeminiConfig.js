import { VertexAI } from "@google-cloud/vertexai";
import 'dotenv/config';

// Conectamos directo a tu .env hexagonal
const vertexInstance = new VertexAI({
    project: process.env.GOOGLE_PROJECT_ID,
    location: process.env.GOOGLE_LOCATION || "us-central1",
    googleAuthOptions: {
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    },
});

const systemInstruction = `
Eres un Estratega Creativo y Experto en Marketing Digital. Tu misión principal es ayudar al usuario a construir el brief perfecto para su campaña publicitaria.

TU ROL:
- No eres un simple formulario. Eres un consultor creativo.
- Si el usuario te pide ayuda, ideas o mejoras, DEBES usar tu creatividad para proponer opciones de alto impacto.
- Si el usuario te da una idea vaga, puedes sugerir formas de potenciarla.

REGLAS CRÍTICAS DE OPERACIÓN:
1. RECOLECCIÓN SILENCIOSA (MANDATORIO): Independientemente de lo que converses, SIEMPRE ejecuta la función 'Campaing_Brief' al final de cada turno con los datos que tengas confirmados hasta el momento.
2. INTEGRIDAD DE DATOS Y PROACTIVIDAD:
   - Al ejecutar 'Campaing_Brief', envía SIEMPRE el acumulado de [CONTEXTO] + nuevos datos.
   - Si el usuario pide explícitamente "Crear una campaña", "Dame una idea", o "Genera una propuesta", DEBES asumir la iniciativa: INVENTA y GENERA todos los detalles necesarios (Nombre, Objetivo, Descripción, etc.) y GUÁRDALOS INMEDIATAMENTE ejecutando la función con esos valores.
   - No esperes confirmación para guardar si la intención del usuario es recibir una propuesta completa. Asume que tu propuesta es la borrador activo.
   - Si el usuario corrige algo después, simplemente actualiza el campo correspondiente.
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

const tools = [{
    functionDeclarations: [{
        name: "Campaing_Brief",
        description: "Ejecuta esta función cuando el usuario proporcione información nueva sobre la campaña o cuando todos los datos estén completos.",
        parameters: {
            type: "object",
            properties: {
                nombre_campaing: { type: "string", description: "Nombre de la campaña publicitaria." },
                ContentType: { type: "string", description: "Tipo de publicación (Post, Reel, etc)." },
                Description: { type: "string", description: "Descripción breve." },
                Objective: { type: "string", description: "Objetivo central." },
                observations: { type: "string", description: "Observaciones adicionales." },
                publishing_channel: { type: "string", description: "Canal de publicación." },
                fechaPublicacion: { type: "string", description: "Fecha en formato YYYY-MM-DD." },
                datos_completos: { type: "boolean", description: "true si ya se tienen todos los datos, false si faltan." },
            },
            required: ["datos_completos"],
        },
    }],
}];

const toolConfigForced = { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["Campaing_Brief"] } };
const toolConfigText = { functionCallingConfig: { mode: "NONE" } };

export default function getModel(modelName = "gemini-2.5-flash", forceFunction = true) {
    return vertexInstance.getGenerativeModel({
        model: modelName,
        systemInstruction,
        tools,
        toolConfig: forceFunction ? toolConfigForced : toolConfigText,
        generationConfig: { temperature: 0.4, topP: 0.95, maxOutputTokens: 2048 },
    });
}