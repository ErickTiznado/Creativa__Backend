/**
 * Servicio para interactuar con Gemini (Vertex AI).
 * Se encarga de tareas de enriquecimiento de texto y generación creativa (Texto e Imagen).
 */

import { VertexAI } from "@google-cloud/vertexai";
import axios from "axios";
import fs from "fs/promises";
import path from "path";

class GeminiService {
  constructor() {
    if (process.env.NODE_ENV === "test") {
      return;
    }
    // Inicializar Vertex AI
    // Asumimos que las credenciales (GOOGLE_APPLICATION_CREDENTIALS) y
    // PROJECT_ID / LOCATION están en variables de entorno o config.
    // Ajusta estos valores según tu setup actual de GCP en el proyecto.
    this.project = process.env.GOOGLE_PROJECT_ID;
    this.location = process.env.GOOGLE_LOCATION || "us-central1";

    this.vertex_ai = new VertexAI({
      project: this.project,
      location: this.location,
    });

    // Modelos
    this.textModelName = "gemini-2.5-pro";
    this.imageModelName = "gemini-2.5-flash-image";

    // Text Model
    this.textModel = this.vertex_ai.getGenerativeModel({
      model: this.textModelName,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
      },
    });

    // Image Model (Optimization: Instantiate only when needed or keep persistent)
    // Para simplificar, lo instanciamos aquí pero podríamos hacerlo lazy
    this.imageModel = this.vertex_ai.getGenerativeModel({
      model: this.imageModelName,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.1, // Baja temperatura para seguir prompts de imagen
        responseModalities: ["IMAGE", "TEXT"],
      },
    });
  }

  /**
   * Mejora un brief de usuario expandiendo detalles visuales.
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
            5. IMPORTANT: Write the output in ENGLISH. This will be used directly for image generation.
            6. NEGATIVE CONSTRAINTS (STRICT):
               - Do NOT include holograms, futuristic interfaces, glowing blue data, floating charts, or iron-man style HUDs.
               - Do NOT make it look like a sci-fi movie. Keep it grounded in a contemporary, realistic setting.
               - Even if the brief mentions "tech" or "data", visualize it as PHYSICAL screens (monitors, tablets, projectors), NOT holograms.
               - Avoid "cyberpunk" or "neon" aesthetics unless the style explicitly requests 'neon-punk'.
            `;

      const request = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      };

      const result = await this.textModel.generateContent(request);
      const response = result.response;

      if (!response.candidates || response.candidates.length === 0) {
        console.warn(
          "[GeminiService] No candidates returned. Using original brief.",
        );
        return originalBrief;
      }

      const enhancedText = response.candidates[0].content.parts[0].text.trim();
      return enhancedText;
    } catch (error) {
      console.error("[GeminiService] Error enhancing brief:", error);
      return originalBrief;
    }
  }

  /**
   * Traduce y optimiza un prompt en español para modelos de imagen.
   */
  async optimizeForImageModel(spanishPrompt) {
    try {
      const prompt = `
            Act as a STRICT TECHNICAL TRANSLATOR for Image Generation Models.
            Your task is to translate the following Spanish prompt into English tags/keywords.

            Input (Spanish): "${spanishPrompt}"

            CRITICAL RULES:
            1. Translate accurately to English.
            2. DO NOT ADD creative adjectives or extra details. Translate ONLY what is there.
            3. DO NOT CHANGE Hex colors (keep them exactly as #123456).
            4. PRESERVE the Negative Prompts (anything after --no).
            5. IGNORE business buzzwords (like "consultoría", "soluciones", "java", "oracle") if they appear as text. FOCUS on visual descriptions (people, office, computers).
            6. Output ONLY the English text.
            `;

      const request = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      };
      const result = await this.textModel.generateContent(request);
      const response = result.response;

      if (!response.candidates || response.candidates.length === 0)
        return spanishPrompt;

      const englishPrompt = response.candidates[0].content.parts[0].text.trim();
      console.log(
        `[Silent Translation] ES len: ${spanishPrompt.length} -> EN len: ${englishPrompt.length}`,
      );
      return englishPrompt;
    } catch (error) {
      console.warn(
        "[GeminiService] Error translating to English, using original:",
        error,
      );
      return spanishPrompt;
    }
  }

  /**
   * Genera imágenes usando el modelo de imagen.
   * @param {Object} params
   * @param {string} params.prompt - Prompt en inglés
   * @param {string[]} params.referenceImages - URLs o Rutas Locales de imagenes de referencia
   * @returns {Promise<Object[]>} Array de buffers de imagen generados
   */
  async generateImages({ prompt, referenceImages = [], aspectRatio = "1:1" }) {
    // 1. Preparar Parts (Prompt + Imagenes)
    const parts = [{ text: prompt }];

    // 2. Procesar imágenes de referencia
    if (referenceImages && referenceImages.length > 0) {
      console.log(
        `[GeminiService] Procesando ${referenceImages.length} imágenes de referencia...`,
      );
      const imageParts = await this._processReferenceImages(referenceImages);
      parts.push(...imageParts);
    }

    const result = await this.imageModel.generateContent({
      contents: [{ role: "user", parts: parts }],
      generationConfig: {
        numberOfImages: 1,
        aspectRatio: aspectRatio,
      },
    });
    const response = await result.response;
    const candidates = response.candidates || [];

    if (candidates.length === 0) {
      throw new Error("Gemini no devolvió candidatos.");
    }

    // Extraer imágenes de la respuesta
    const generatedImages = [];
    for (const candidate of candidates) {
      const cParts = candidate.content.parts || [];
      const imagePart = cParts.find((p) => p.inlineData);
      if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
        generatedImages.push(Buffer.from(imagePart.inlineData.data, "base64"));
      }
    }

    if (generatedImages.length === 0) {
      // Intentar leer texto de error si no hay imagen
      let textResponse = "";
      candidates[0].content?.parts?.forEach((p) => {
        if (p.text) textResponse += p.text;
      });
      // A veces Gemini se niega y explica por qué en texto
      throw new Error(
        `Gemini respondió solo texto (posible bloqueo): ${textResponse.substring(0, 100)}...`,
      );
    }

    return generatedImages;
  }

  /**
   * Refina/Fusiona imágenes existentes basado en un prompt.
   * @param {string} prompt - Prompt de refinamiento
   * @param {Object[]} imageParts - Array de partes inlineData obtenidas de assets
   * @param {string[]} referenceImages - [NUEVO] Rutas/URLs de referencias obligatorias (logo, etc.)
   */
  async refineImage(prompt, imageParts, referenceImages = []) {
    if (!imageParts || imageParts.length === 0) {
      throw new Error("Se requieren imágenes para refinar.");
    }

    const parts = [{ text: prompt }];

    // 1. Añadir imágenes a editar (Subject)
    parts.push(...imageParts);

    // 2. Añadir referencias obligatorias (Style/Logo)
    if (referenceImages && referenceImages.length > 0) {
      console.log(
        `[GeminiService] Añadiendo ${referenceImages.length} referencias al refinamiento...`,
      );
      const refParts = await this._processReferenceImages(referenceImages);
      parts.push(...refParts);
    }

    const reqContent = {
      contents: [{ role: "user", parts }],
    };

    console.log(
      `[GeminiService] Refinando/Fusionando con ${imageParts.length} assets y ${referenceImages.length} referencias...`,
    );

    const result = await this.imageModel.generateContent(reqContent);
    const response = await result.response;
    const candidate = response.candidates[0];

    // Buscar imagen en respuesta
    const imagePart = candidate?.content?.parts?.find((p) => p.inlineData);

    // Buscar texto (comentarios)
    let textResponse = "";
    candidate?.content?.parts?.forEach((p) => {
      if (p.text) textResponse += p.text;
    });

    if (imagePart) {
      return {
        buffer: Buffer.from(imagePart.inlineData.data, "base64"),
        text: textResponse,
      };
    } else {
      return { buffer: null, text: textResponse };
    }
  }

  /**
   * Helper privado para descargar imágenes de referencia (URL) o leer locales.
   */
  async _processReferenceImages(inputs) {
    const parts = [];
    for (const input of inputs) {
      try {
        let base64Image;
        let mimeType;

        if (input.startsWith("http://") || input.startsWith("https://")) {
          // Es URL
          const responseImg = await axios.get(input, {
            responseType: "arraybuffer",
          });
          base64Image = Buffer.from(responseImg.data).toString("base64");
          mimeType = input.endsWith("png") ? "image/png" : "image/jpeg";
        } else {
          // Es Archivo Local
          const fileBuffer = await fs.readFile(input);
          base64Image = fileBuffer.toString("base64");
          const ext = path.extname(input).toLowerCase();
          mimeType = ext === ".png" ? "image/png" : "image/jpeg";
        }

        parts.push({
          inlineData: { mimeType, data: base64Image },
        });
      } catch (e) {
        console.warn(
          `[GeminiService] Error procesando referencia ${input}: ${e.message}`,
        );
      }
    }
    return parts;
  }
}

export default new GeminiService();
