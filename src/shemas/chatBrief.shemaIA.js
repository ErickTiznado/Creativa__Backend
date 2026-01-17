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
            responseMessage: {
              type: "string",
            },
            ContentType: {
              type: "string",
              description: "Tipo de publicación, se especifica si sera un post, Reel Story, entre otros, dejar vacío si no se conoce",
            },
            Topic: {
              type: "string",
              Description:
                "Tematica de la campaña, dejar vacío si no se conoce",
            },
            Description: {
              type: "string",
              description:
                "descripción breve de lo que trata la campaña, dejar vacío si no se conoce",
            },

            Objective: {
              type: "string",
              description:
                "objetivo central de la campaña, dejar vacío si no se conoce",
            },
            observations: {
              type: "string",
              description:
                "Observaciones adicionales sobre la campaña, dejar vacío si no se conoce",
            },
            fechaPublicacion: {
              type: "string",
              description:
                "Fecha en la que se espera publicar la campaña, dejar vacío si no se conoce",
            },
            datos_completos: {
              type: "BOOLEAN",
              description:
                "true si el usuario dio todos los datos, false si no los a proporcionado todos.",
            },
          },
          systemInstructions: `
        
        Eres un asistente de recolección de datos. Tu objetivo es extraer datos de campañas de la conversación. 
        REGLA CRÍTICA: Si el usuario no ha proporcionado explícitamente un dato, debes dejar el campo como null o una cadena vacía "". 
        PROHIBIDO: No inventes, supongas o generes ejemplos de datos. 
        Si un dato falta, pregunta al usuario por él en tu respuesta de texto, pero mantén el campo vacío en el JSON
        {
  "ContentType": "string",
  "Topic": "string",
  "Description": "string",
  "Objective": "string",
  "observations": "string"
  "fechaPublicacion": "string",
  "datos_completos": "BOOLEAN",
}
=> REGLA EXTRICTA <=
La fecha debe ser solicitada en formato YYYY-MM-DD, si se proporciona en otro formato solicitar que se proporcione en el formato correcto

REGLAS DE ORO:
1. En cada mensaje, verifica qué datos faltan.
2. Pide los datos faltantes uno por uno, haciendo uso de userMessage, para este propocito.
3. Si el usuario da información nueva o cambia una anterior, ejecuta 'Campaing_Brief'.
4. Tu respuesta de texto (fuera de la función) debe ser amable y pedir el siguiente dato.
5. No inventes información; si el usuario no la proporciona, es null.
6. Siempre contestar en español
7. Hoy es ${new Date().toISOString().split("T")[0]}. 
    Extrae o calcula fechas futuras. Si el usuario no menciona una fecha, 
    deja el campo 'fechaPublicacion' como null o vacío.
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
      responseMessage: {
        type: "string",
        description:
          " enviar un Mensage para el usuario donde se solicite la información faltante la campaña, un campo cada vez, la fecha debes solicitarla en el formato YYYY-MM-DD, En caso de contar con los datos requeridos, agradece y has un resumen dentro responseMessage",
      },
      ContentType: {
        type: "string",
        description: "Tipo de publicación, se especifica si sera un post, Reel Story, entre otros, dejar vasio si se desconoce",
      },
      Topic: {
        type: "string",
        description: "Tematica de la campaña, dejar vasio si se desconoce",
      },
      Description: {
        type: "string",
        description:
          "descripción breve de lo que trata la campaña, , dejar vasio si se desconoce",
      },
      Objective: {
        type: "string",
        description:
          "Objetivo central de la campaña, dejar vasio si se desconoce",
      },
      observations: {
        type: "string",
        description:
          "Observaciones adicionales como requerimientos, dejar vasio si se desconoce",
      },
      fechaPublicacion: {
        type: "string",
        description:
          `Fecha de publicación de la campaña siempre en formato YYYY-MM-DD, el calculo debe realizarse a partir de ${new Date().toISOString().split("T")[0]} , dejar vasio si se desconoce`,
      },
      datos_completos: {
        type: "BOOLEAN",
        description:
          "true si el usuario dio todos los datos, false si no los a proporcionado todos.",
      },
    },
    required: [
      "responseMessage",
      "ContentType",
      "Topic",
      "Description",
      "Objective",
      "observations",
      "fechaPublicacion",
      "datos_completos",
    ],
  },
};

function getModel(modelName = "Gemini_2.5_flash") {
  return vertexInstance.getGenerativeModel({
    model: modelName,
    details,
    generationConfig: generationConfig,
    temperature: 0.0,
  });
}

export default getModel;
