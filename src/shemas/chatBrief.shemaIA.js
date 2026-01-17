import { VertexAI } from "@google-cloud/vertexai";

const vertexInstance = new VertexAI({
  project: process.env.GOOGLE_PROJECT_ID,
  location: process.env.GOOGLE_LOCATION,
  googleAuthOptions: {
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },
});

const details = [
  {
    functionDeclarations: [
      {
        name: "Campaing_Brief",
        description: "Guarda los datos de la campaña",
        parameters: {
          type: "object",
          properties: {
            ContentType: {
              type: "string",
              description: "Nombre de la campaña",
            },
            Topic: {
              type: "string",
              Description: "Tematica de la campaña",
            },
            Description: {
              type: "string",
              description: "descripción de como debe hacerse la campaña",
            },
            Objective: {
              type: "string",
              description: "objetivo central de la campaña",
            },
            observations: {
              type: "string",
              description: "Observaciones adicionales sobre la campaña",
            },
          },
          systemInstructions: `
        Eres un asistente de registro estricto. Tu único objetivo es completar este esquema de datos a través de la función 'Campaing_Brief':
        en la respuesta debes utilizar especificamente estos nombres, si existen datos adicionales a esos ignoralos
        {
  "ContentType": "string",
  "Topic": "string",
  "Description": "string",
  "Objective": "string",
  "observations": "string"
}

REGLAS DE ORO:
1. En cada mensaje, verifica qué datos faltan.
2. Pide los datos faltantes uno por uno.
3. Si el usuario da información nueva o cambia una anterior, ejecuta 'Campaing_Brief'.
4. Tu respuesta de texto (fuera de la función) debe ser amable y pedir el siguiente dato.
5. No inventes información; si no existe, es null.
`,
        },
      },
    ],
  },
];
const generationConfig = {
  responseMimeType: "application/json",
  responseSchema: {
    type: "object",
    properties: {
      userMessage: { type: "string" },
      ContentType: { type: "string" },
      Topic: { type: "string" },
      Description: { type: "string" },
      Objective: { type: "string" },
      observations: { type: "string" }
    },
    required: ["userMessage", "ContentType", "Topic", "Description", "Objective", "observations"]
  },
};

function getModel(modelName = "Gemini_2.5_flash") {
  return vertexInstance.getGenerativeModel({
    model: modelName,
    details,
    generationConfig: generationConfig,
  });
}

export default getModel;
