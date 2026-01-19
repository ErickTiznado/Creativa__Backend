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

import { Regulator } from "nicola-framework";
Regulator.load();
import getModel from "../shemas/chatBrief.shemaIA.js";

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
  fechaPublicacion: ""
}

/**
 * Almacén de conversaciones en memoria.
 * Key: sessionID (string único por usuario/sesión)
 * Value: { message: Array, data: Object }
 * - message: historial de mensajes para contexto del modelo
 * - data: campos del brief completados hasta el momento
 */
const conversations = new Map();




const model = getModel('gemini-2.5-flash')

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
  const {sessionID, userMessage, userId, campaignId} = req.body

  // Validación del sessionID
  if(!sessionID) {
    res.statusCode = 400;
    return res.json({ error: "El campo sessionID es obligatorio." });
  }

  if(!conversations.has(sessionID)){
    conversations.set(sessionID, {
      message: [],
      data:{},
      userId: userId || null,
      campaignId: campaignId || null
    })
  }
  const session = conversations.get(sessionID)

  session.message.push({
    role: "user",
    parts:[{text: userMessage}]

  })

  const response = await model.generateContent({
    contents: session.message
  })

  const candidate = response.response.candidates[0]
  const part = candidate.content.parts[0]

  // Si el modelo ejecutó un function call, procesamos los datos
  if(part.functionCall){
    const {name, args} = part.functionCall
    
    if(name === "Campaing_Brief") {
      // Actualizamos los datos de la sesión con los argumentos recibidos
      Object.assign(session.data, args)
      
      // Agregamos la respuesta del function call al historial
      session.message.push(candidate.content)
      
      // Si los datos están completos, persistimos
      if(args.datos_completos) {
        await registrarConFetch(session.data, session.campaignId)
      }
      
      // Generamos una respuesta para el usuario
      const functionResponse = {
        role: "function",
        parts: [{
          functionResponse: {
            name: "Campaing_Brief",
            response: { success: true }
          }
        }]
      }
      
      session.message.push(functionResponse)
      
      // Generamos la siguiente respuesta del modelo
      const nextResponse = await model.generateContent({
        contents: session.message
      })
      
      const nextCandidate = nextResponse.response.candidates[0]
      const nextPart = nextCandidate.content.parts[0]
      
      session.message.push(nextCandidate.content)
      
      return res.json({
        type: args.datos_completos ? "completed" : "data_collected",
        text: nextPart.text || "Datos guardados correctamente.",
        collectedData: session.data,
        missingFields: dataValidator(session.data)
      })
    }
  }

  // Si no hubo function call, es una respuesta normal de texto
  session.message.push(candidate.content)

  res.json({
    type: "message",
    text: part.text,
    collectedData: session.data,
    missingFields: dataValidator(session.data)
  });


}

/**
 * Devuelve la lista de campos faltantes contra el esquema `brief`.
 */
function dataValidator(data) {
  return Object.keys(brief).filter(
    key => !data[key]
  );
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
      ...(idCampaing && { idCampaing })
    };
    
    console.log('📤 Guardando brief:', payload);
    
    const response = await fetch('http://localhost:3000/ai/registerBrief', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Error al guardar campaña:', response.status, errorData);
      return null;
    }
    
    const result = await response.json();
    console.log('✅ Brief guardado exitosamente:', result);
    return result;
  } catch (error) {
    console.error('❌ Error en registrarConFetch:', error);
    return null;
  }
}


export  default handleChat;
