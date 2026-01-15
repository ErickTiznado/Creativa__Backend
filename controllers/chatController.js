import { Regulator } from "nicola-framework";
import getModel from "../services/aiServices.js";
Regulator.load()


async function handleChat(req, res) {

    const {userMessage} = req.body;



    try{

        const model = getModel('gemini-2.5-flash')
        const result =  await model.generateContent(userMessage);
        const response =  await result.response;





        const text =  response.candidates[0].content.parts[0].text;





        res.json({
            succes: true,
            reply: text
        })

    }catch(err){

        console.log(err)

    }

   

}



export default handleChat;