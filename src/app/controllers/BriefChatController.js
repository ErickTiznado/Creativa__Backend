import dotenv from "dotenv";
dotenv.config();
import getModel from "../shemas/chatBrief.shemaIA.js";
import Brief from "../model/Brief.model.js";
import { VertexAI } from "@google-cloud/vertexai";
import { Regulator, Dynamo } from "nicola-framework";


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
  const {sessionID, userMessage} = req.body

// await Dynamo.connect();

// const verificacion_sesion = await User.where("idBrief", sessionID).get();

// if(verificacion_sesion){
// sessionID = verificacion_sesion.idBrief
// }else{
//   const created = await User.create({});
// }
// await Dynamo.disconnect();

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

// await Dynamo.connect();
// const briefID = await brief.all().orderBy("idBrief", "DESC").limit(1);

// let datos = cleanAndParse(candidate.content.parts.text)

// await User.where("idBrief", briefID).update({ ContentType: datos.ContentType});

// await Dynamo.disconnect();

  session.message.push(candidate.content)
  let jsonData = cleanAndParse(candidate.content.parts[0].text)
  console.log(jsonData)
  

  res.json({
    type: "message",
    text: part.text,
    collectedData: session.data,
    missingFields: dataValidator(session.data)
  });


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
        console.error("Error al parsear el JSON:", error);
        return null;
    }
}

export  default handleChat;
