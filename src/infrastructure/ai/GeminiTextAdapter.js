import { VertexAI } from "@google-cloud/vertexai";
import TextGenerationPort from "../../application/ports/TextGenerationPort.js";
import "dotenv/config";

class GeminiTextAdapter extends TextGenerationPort {
    #vertexInstance;
    #modelName;

    constructor(modelName = "gemini-2.5-flash") {
        super();
        this.#modelName = modelName;

        const authOptions = {};
        if (process.env.GOOGLE_CREDS_JSON) {
            try {
                authOptions.credentials = JSON.parse(process.env.GOOGLE_CREDS_JSON);
            } catch (e) {
                console.error("[GeminiTextAdapter] Error al parsear GOOGLE_CREDS_JSON:", e);
            }
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            authOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        }

        this.#vertexInstance = new VertexAI({
            project: process.env.GOOGLE_PROJECT_ID,
            location: process.env.GOOGLE_LOCATION || "us-central1",
            googleAuthOptions: authOptions,
        });
    }

    async generateText(systemPrompt, userPrompt) {
        const model = this.#vertexInstance.getGenerativeModel({
            model: this.#modelName,
            systemInstruction: systemPrompt,
            generationConfig: {
                temperature: 0.8,
                topP: 0.95,
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
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
