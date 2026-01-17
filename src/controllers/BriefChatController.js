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

async function handleChat(req, res) {
  const {sessionID, userMessage, idCampaing} = req.body




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

  registrarConFetch(jsonData,idCampaing)
  
  

  res.json({
    type: "message",
    text: part.text,
    collectedData: session.data,
    missingFields: dataValidator(session.data)
  });

  return jsonData
}
function dataValidator(data) {
  return Object.keys(brief).filter(
    key => !data[key]
  );
}

function cleanAndParse(text) {
    try {
        const cleanText = text.replace(/```json|```/g, "").trim();
        
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Error al parsear la campaña:", error);
        return null;
    }
}

async function registrarConFetch(data, idCampaing = null) {
  
  const response = await fetch('http://localhost:3000/ai/updateCampaing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({data: data, idCampaing: idCampaing})
  })
}


export  default handleChat;
