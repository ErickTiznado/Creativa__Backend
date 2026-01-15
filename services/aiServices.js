import { VertexAI } from "@google-cloud/vertexai";
import { Regulator } from "nicola-framework";
Regulator.load()
const vertexInstance =  new VertexAI({
    project: process.env.GOOGLE_PROJECT_ID,
    location: process.env.GOOGLE_LOCATION,
    googleAuthOptions:{
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    }
});

function getModel(modelName = 'gemini-1.5-flash-001'){
    return vertexInstance.getGenerativeModel({
        model: modelName,
    })
}


export default getModel;