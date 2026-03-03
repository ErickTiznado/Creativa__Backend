import { VertexAI } from "@google-cloud/vertexai";
import TextGenerationPort from "../../application/ports/TextGenerationPort.js";
import "dotenv/config";

class GeminiTextAdapter extends TextGenerationPort {
    #vertexInstance;
    #modelName;

    constructor(modelName = "gemini-2.5-flash") {
        super();
        this.#modelName = modelName;
        this.#vertexInstance = new VertexAI({
            project: process.env.GOOGLE_PROJECT_ID,
            location: process.env.GOOGLE_LOCATION || "us-central1",
            googleAuthOptions: {
                keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            },
        });
    }

    async generateText(systemPrompt, userPrompt) {
        const model = this.#vertexInstance.getGenerativeModel({
            model: this.#modelName,
            systemInstruction: systemPrompt,
            generationConfig: {
                temperature: 0.8,
                topP: 0.95,
                maxOutputTokens: 2048,
            },
        });

        const response = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        });

        const candidate = response.response.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error("Gemini returned no text content.");
        }

        return text;
    }
}

export default GeminiTextAdapter;
