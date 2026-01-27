/**
 * Servicio para interactuar con Gemini (Vertex AI).
 * Se encarga de tareas de enriquecimiento de texto y generación creativa.
 */

import { VertexAI } from "@google-cloud/vertexai";
import { PROMPT_CONFIG } from "./promptConstants.js";

class GeminiService {
    constructor() {
        // Inicializar Vertex AI
        // Asumimos que las credenciales (GOOGLE_APPLICATION_CREDENTIALS) y 
        // PROJECT_ID / LOCATION están en variables de entorno o config.
        // Ajusta estos valores según tu setup actual de GCP en el proyecto.
        this.project = process.env.GOOGLE_PROJECT_ID;
        this.location = process.env.GOOGLE_LOCATION || 'us-central1';

        this.vertex_ai = new VertexAI({ project: this.project, location: this.location });

        // Usamos el modelo definido en constantes o fallback a gemini-1.5-pro
        this.modelName = 'gemini-2.5-pro';

        this.generativeModel = this.vertex_ai.getGenerativeModel({
            model: this.modelName,
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.7,
                topP: 0.9,
            },
        });
    }

    /**
     * Mejora un brief de usuario expandiendo detalles visuales.
     * @param {string} originalBrief - Brief corto del usuario
     * @param {string} style - Estilo visual seleccionado (contexto para la mejora)
     * @returns {Promise<string>} Brief mejorado y detallado
     */
    async enhanceBrief(originalBrief, style) {
        try {
            const prompt = `
            Act as an expert Art Director and Prompt Engineer.
            Your task is to ENHANCE the following user brief for an image generation AI.
            
            User Brief: "${originalBrief}"
            Target Style: "${style}"

            Guidelines:
            1. Expand on visual details (lighting, texture, composition, atmosphere).
            2. Keep the core subject and action intact. Do not change the meaning.
            3. Use descriptive adjectives appropriate for the target style.
            4. Output ONLY the enhanced description. No introductions like "Here is the enhanced brief".
            5. Write in English (image models understand it better), even if input is Spanish.
            `;

            const request = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            };

            const result = await this.generativeModel.generateContent(request);
            const response = result.response;

            if (!response.candidates || response.candidates.length === 0) {
                console.warn('[GeminiService] No candidates returned. Using original brief.');
                return originalBrief;
            }

            const enhancedText = response.candidates[0].content.parts[0].text.trim();
            return enhancedText;
        } catch (error) {
            console.error('[GeminiService] Error enhancing brief:', error);
            // Fallback silencioso: si falla la IA, usamos el brief original
            return originalBrief;
        }
    }
}

export default new GeminiService();