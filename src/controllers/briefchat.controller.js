/**
 * ------------------------------------------------------------------
 * Archivo: BriefChatController.js
 * Ubicación: src/controllers/BriefChatController.js
 * Responsabilidad: Orquestar el chat conversacional con Vertex AI (Gemini) para
 * recolectar datos del brief de una campaña publicitaria.
 *
 * Flujo de operación:
 * 1. Recibe mensaje del usuario con sessionID único.
 * 2. Mantiene historial de conversación en memoria (Map).
 * 3. Envía contexto completo a Gemini para generar respuesta.
 * 4. Si el modelo llama a function 'Campaing_Brief', persiste los datos.
 * 5. Retorna la respuesta del asistente al cliente.
 *
 * Notas de mantenibilidad:
 * - Las sesiones se pierden al reiniciar el servidor (estado en RAM).
 * - El modelo está configurado con function declarations para estructurar datos.
 * - La persistencia se hace vía HTTP interno a POST /ai/createCampaing.
 * - Los datos del brief se definen en el objeto `brief` (esquema esperado).
 * ------------------------------------------------------------------
 */
import { cyan } from "nicola-framework";
import { Regulator } from "nicola-framework";
Regulator.load();
import getModel from "../shemas/chatBrief.shemaIA.js";
import ChatSession from "../model/ChatSession.model.js";

/**
 * Helper para ejecutar llamadas al modelo con retry y exponential backoff.
 * Maneja errores 429 (Too Many Requests) reintentando automáticamente.
 * @param {Function} fn - Función async que ejecuta la llamada al modelo
 * @param {number} maxRetries - Número máximo de reintentos (default: 3)
 * @param {number} baseDelay - Delay base en ms (default: 1000)
 * @returns {Promise} - Resultado de la llamada al modelo
 */
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimited =
        error.message?.includes("429") ||
        error.message?.includes("RESOURCE_EXHAUSTED") ||
        error.message?.includes("Too Many Requests");

      if (isRateLimited && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Estructura del brief que el modelo debe completar.
 * Estos campos se irán llenando durante la conversación.
 */
const brief = {
  nombre_campaing: "",
  ContentType: "",
  Description: "",
  Objective: "",
  observations: "",
  publishing_channel: "",
  fechaPublicacion: "",
};

/**
 * Almacén de conversaciones en memoria -> REEMPLAZADO POR BD
 * Se utiliza el modelo ChatSession para persistencia.
 */
// const conversations = new Map(); // Removed

/**
 * Dos instancias del modelo:
 * - modelFunction: Fuerza function calls para recolectar datos
 * - modelText: Genera respuestas de texto para interactuar con el usuario
 */
const modelFunction = getModel("gemini-2.5-flash", true); // Fuerza function calling
const modelText = getModel("gemini-2.5-flash", false); // Solo respuestas de texto

/**
 * Handler principal del endpoint POST /ai/chat.
 *
 * @param {Object} req.body - { sessionID: string, userMessage: string, userId?: string, campaignId?: string }
 * @returns {Object} - { response: string, data?: Object }
 *
 * Descripción:
 * Gestiona la conversación con el usuario. Si es la primera interacción de la sesión,
 * crea un registro en `conversations` con userId y campaignId opcional.
 * Envía el historial completo a Gemini, procesa la respuesta (que puede incluir function calls),
 * y persiste los datos si están completos.
 */
async function handleChat(req, res) {
  const { sessionID, userMessage, userId, campaignId } = req.body;
  // Validación del sessionID
  if (!sessionID) {
    res.statusCode = 400;
    return res.json({ error: "El campo sessionID es obligatorio." });
  }

  // Estructura base de la sesión (en memoria para esta request)
  let session = {
    message: [],
    data: {},
    userId: userId || null,
    campaignId: campaignId || null,
  };

  let sessionRecord = null;

  try {
    // Intentar recuperar sesión de la BD
    // Dynamo ORM no tiene .find(), usamos .where().get()
    const sessionResult = await ChatSession.where("id", sessionID).get();
    sessionRecord =
      sessionResult && sessionResult.length > 0 ? sessionResult[0] : null;

    if (sessionRecord) {
      const chatContent = sessionRecord.chat || {};
      session.message = chatContent.message || [];
      session.data = chatContent.data || {};
      // Mantener IDs si ya existen
      session.userId = sessionRecord.userId || session.userId;
      session.campaignId = sessionRecord.campings_id || session.campaignId;
    } else {
      // Crear nueva sesión si no existe
      // Nota: campings_id debe ser un UUID válido si se provee, o null.
      // Si campaignId viene del cliente, lo usamos.
      const newRecordPayload = {
        id: sessionID,
        chat: { message: [], data: {} },
        '"userId"': userId || null,
        campings_id: campaignId || null,
      };

      // Eliminar campos null/undefined para evitar problemas
      if (!newRecordPayload['"userId"']) delete newRecordPayload['"userId"'];

      // FIX: No eliminar campings_id si es null.
      // Si lo eliminamos, Postgres usa el DEFAULT (gen_random_uuid()) que genera un ID inexistente
      // y rompe la FK. Al enviar null explícitamente, evitamos el default.
      if (newRecordPayload.campings_id === undefined) {
        newRecordPayload.campings_id = null;
      }

      try {
        sessionRecord = await ChatSession.create(newRecordPayload);
      } catch (createError) {
        console.error(
          "Error creating session (might exist race condition):",
          createError,
        );
        // Try finding again if create failed
        const retryResult = await ChatSession.where("id", sessionID).get();
        sessionRecord =
          retryResult && retryResult.length > 0 ? retryResult[0] : null;
      }
    }
  } catch (error) {
    console.error("Error al acceder a la BD de sesiones:", error);
    // Fallback: Si falla la BD, continuamos en memoria
  }

  // Helper para guardar cambios en la BD antes de responder
  const persistSession = async () => {
    try {
      if (sessionID) {
        // IMPORTANTE: Primero filtrar con WHERE antes de llamar a update
        await ChatSession.where("id", sessionID).update({
          chat: {
            message: session.message,
            data: session.data,
          },
          // Actualizar campaignId si cambió o si se quiere forzar
          ...(session.campaignId ? { campings_id: session.campaignId } : {}),
        });
      }
    } catch (error) {
      console.error("Error persistiendo sesión:", error);
    }
  };

  // Construir mensaje del usuario con contexto de datos actuales
  const currentDataContext =
    Object.keys(session.data).length > 0
      ? `\n[CONTEXTO - Datos recolectados hasta ahora: ${JSON.stringify(session.data)}]`
      : "";

  session.message.push({
    role: "user",
    parts: [{ text: userMessage + currentDataContext }],
  });

  // Primera llamada: forzamos function call para recolectar datos (con retry)
  let response = await withRetry(() =>
    modelFunction.generateContent({
      contents: session.message,
    }),
  );

  if (!response.response.candidates[0]) {
    res.statusCode = 500;
    return res.json({ error: "No se pudo generar una respuesta." });
  }
  const candidate = response.response.candidates[0];
  const part = candidate.content.parts[0];

  // Si el modelo ejecutó un function call, procesamos los datos
  if (part.functionCall) {
    const { name, args } = part.functionCall;

    if (name === "Campaing_Brief") {
      // Actualizamos los datos de la sesión con los argumentos recibidos
      const filteredArgs = Object.fromEntries(
        Object.entries(args).filter(([key, value]) => {
          if (key === "datos_completos") return true;
          return value !== "" && value !== null && value !== undefined;
        }),
      );

      Object.assign(session.data, filteredArgs);

      session.message.push(candidate.content);

      if (args.datos_completos) {
        await registrarConFetch(session.data, session.campaignId);
      }

      const functionResponse = {
        role: "function",
        parts: [
          {
            functionResponse: {
              name: "Campaing_Brief",
              response: {
                success: true,
                currentData: session.data,
                missingFields: dataValidator(session.data),
              },
            },
          },
        ],
      };

      session.message.push(functionResponse);

      const nextResponse = await withRetry(() =>
        modelText.generateContent({
          contents: session.message,
        }),
      );

      const nextCandidate = nextResponse.response.candidates[0];
      const nextPart = nextCandidate.content.parts[0];

      session.message.push(nextCandidate.content);

      // Persistir en BD
      await persistSession();

      const cleanData = { ...session.data };
      delete cleanData.datos_completos;

      return res.json({
        type: args.datos_completos ? "completed" : "data_collected",
        text: nextPart.text || "Datos guardados correctamente.",
        collectedData: cleanData,
        missingFields: dataValidator(session.data),
        success: true,
      });
    }
  }

  // Si no hubo function call, intentamos forzar la extracción de datos
  const originalText = part.text;
  session.message.push(candidate.content);

  const retryPrompt = {
    role: "user",
    parts: [
      {
        text:
          "[SISTEMA] Por favor ejecuta la función Campaing_Brief ahora con los datos que has recolectado hasta el momento. Datos actuales: " +
          JSON.stringify(session.data),
      },
    ],
  };
  session.message.push(retryPrompt);

  const retryResponse = await withRetry(() =>
    modelFunction.generateContent({
      contents: session.message,
    }),
  );

  const retryCandidate = retryResponse.response.candidates[0];
  const retryPart = retryCandidate?.content?.parts[0];

  if (
    retryPart?.functionCall &&
    retryPart.functionCall.name === "Campaing_Brief"
  ) {
    const { args } = retryPart.functionCall;
    const filteredArgs = Object.fromEntries(
      Object.entries(args).filter(
        ([key, value]) => value !== "" && value !== null && value !== undefined,
      ),
    );
    Object.assign(session.data, filteredArgs);
    session.message.push(retryCandidate.content);

    const functionResponse = {
      role: "function",
      parts: [
        {
          functionResponse: {
            name: "Campaing_Brief",
            response: {
              success: true,
              currentData: session.data,
              missingFields: dataValidator(session.data),
            },
          },
        },
      ],
    };
    session.message.push(functionResponse);

    const textResponse = await withRetry(() =>
      modelText.generateContent({
        contents: session.message,
      }),
    );
    const textPart = textResponse.response.candidates[0]?.content?.parts[0];
    session.message.push(textResponse.response.candidates[0].content);

    // Persistir en BD
    await persistSession();

    const cleanData = { ...session.data };
    delete cleanData.datos_completos;

    return res.json({
      type: args.datos_completos ? "completed" : "data_collected",
      text:
        textPart?.text ||
        originalText ||
        "He registrado la información proporcionada. ¿Qué más puedo ayudarte?",
      collectedData: cleanData,
      missingFields: dataValidator(session.data),
      chat: session.message,
      success: true,
    });
  }

  const cleanData = { ...session.data };
  delete cleanData.datos_completos;

  // Persistir en BD
  await persistSession();

  res.json({
    type: "message",
    text: originalText || part.text,
    collectedData: cleanData,
    missingFields: dataValidator(session.data),
    warning:
      "El modelo no ejecutó la función de recolección. Los datos mostrados son los acumulados hasta ahora.",
  });
}

/**
 * Devuelve la lista de campos faltantes contra el esquema `brief`.
 */
function dataValidator(data) {
  return Object.keys(brief).filter((key) => !data[key]);
}

/**
 * Normaliza el texto que llega del modelo y trata de parsearlo como JSON.
 * Si falla, devuelve null.
 */
function cleanAndParse(text) {
  try {
    const cleanText = text.replace(/```json|```/g, "").trim();

    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Error al parsear la campaña:", error);
    return null;
  }
}

/**
 * Persistencia “best effort” hacia el endpoint interno `/ai/createCampaing`.
 * Nota: requiere Node >= 18 para `fetch` global.
 */
async function registrarConFetch(data, idCampaing = null) {
  try {
    // Limpiar el campo datos_completos antes de guardar (es metadata del chat)
    const briefData = { ...data };
    delete briefData.datos_completos;

    const payload = {
      data: briefData,
      ...(idCampaing && { idCampaing }),
    };

    const response = await fetch("http://localhost:3000/ai/registerBrief", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("❌ Error al guardar campaña:", response.status, errorData);
      return null;
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("❌ Error en registrarConFetch:", error);
    return null;
  }
}

export default handleChat;
