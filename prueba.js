import { VertexAI } from "@google-cloud/vertexai";
import dotenv from "dotenv";
dotenv.config();

const vertexAI = new VertexAI({
    project: process.env.GOOGLE_PROJECT_ID,
    location: process.env.GOOGLE_CLOUD_LOCATION,
    googleAuthOptions: {
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    }
});
console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS);
let aspectRatio = "1:1";
const genConfig = {
    candidateCount: 1,
    maxOutputTokens: 2048,
    temperature: 0.45,
    imageConfig: {
        aspectRatio: aspectRatio,
    },
}

async function generateImages(prompt, { numberOfImages = 1, aspectRatio = "1:1" }) {
    const model = vertexAI.getGenerativeModel({
        model: "gemini-2.5-flash-image ",
        generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
        }
    });

    const response = await model.generateContent({
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: prompt,
                    }
                ],
            },

        ],
        generationConfig: genConfig,

    });
    return response
}


const response = await generateImages("Hola", { numberOfImages: 1, aspectRatio: "1:1" });
console.log(response)
