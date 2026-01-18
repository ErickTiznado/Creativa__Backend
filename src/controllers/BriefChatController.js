/**
 * ------------------------------------------------------------------
 * Archivo: BriefChatController.js
 * Ubicación: src/controllers/BriefChatController.js
 * Responsabilidad: Orquestar el chat con Vertex AI para recolectar un brief.
 *
 * Notas de mantenibilidad:
 * - Mantiene estado de conversación en memoria (Map). Reiniciar el proceso borra sesiones.
 * - El modelo puede devolver function-calls: se fusionan en `session.data`.
 * - Este controlador también dispara una persistencia vía HTTP a /ai/createCampaing.
 * ------------------------------------------------------------------
 */

import { Regulator } from "nicola-framework";
Regulator.load();
import getModel from "../shemas/chatBrief.shemaIA.js";

const brief = {
nombre_camapaing: "",
 ContentType: "",
  Description: "",
  Objective: "",
  observations: "",
  publishing_channel: ""
  
}

const conversations = new Map();




const model = getModel('gemini-2.5-flash')

/**
 * Handler principal del chat.
 * Espera `sessionID` y `userMessage` en el body.
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
