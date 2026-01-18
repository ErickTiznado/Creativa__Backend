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
nombre_camapaing: "",
 ContentType: "",
  Description: "",
  Objective: "",
  observations: "",
  publishing_channel: ""
  
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
 * @param {Object} req.body - { sessionID: string, userMessage: string }
 * @returns {Object} - { response: string, data?: Object }
 * 
 * Descripción:
 * Gestiona la conversación con el usuario. Si es la primera interacción de la sesión,
 * crea un registro en `conversations`. Envía el historial completo a Gemini, procesa
 * la respuesta (que puede incluir function calls), y persiste los datos si están completos.
 */
async function handleChat(req, res) {
  const {sessionID, userMessage} = req.body




  if(!conversations.has(sessionID)){
    conversations.set(sessionID, {
      message: [],
      data:{}
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

  if(part.functionCall){
    const {args} = part.functionCall

    Object.assign(session.data, args)
     return res.json({
       type: "data_collected",
      collectedData: session.data,
      missingFields: dataValidator(session.data)
    })
  }


  session.message.push(candidate.content)
  let jsonData = cleanAndParse(candidate.content.parts[0].text)

  registrarConFetch(jsonData)
  

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
  const response = await fetch('http://localhost:3000/ai/createCampaing', {
    method: 'POST',
    headers: {

      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({data, idCampaing: "id"})
  })
}


export  default handleChat;
