/**
 * Servicio para interactuar con Gemini (Vertex AI).
 * Se encarga de tareas de enriquecimiento de texto y generación creativa (Texto e Imagen).
 * EDITED: VERSIÓN FINAL "MASTER".
 * - Incluye Sharp para estampado de logo.
 * - Incluye Lógica Adaptativa en refineImage (Objetos/Personas/Temas).
 * - Incluye Estampado de Texto DINÁMICO (Posicionable vía Prompt).
 */

import { VertexAI } from "@google-cloud/vertexai";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp"; // REQUERIDO: npm install sharp

// RUTA ABSOLUTA AL LOGO OFICIAL
const LOGO_PATH = path.join(process.cwd(), 'src', 'references', 'logo_creativa.png');
// RUTA A LA FUENTE (TIPOGRAFÍA) - Montserrat-Bold renombrada
const FONT_PATH = path.join(process.cwd(), 'src', 'assets', 'fonts', 'brand-font.ttf');

class GeminiService {
  constructor() {
    if (process.env.NODE_ENV === "test") {
      return;
    }
    // Inicializar Vertex AI
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

    // Image Model
    this.imageModel = this.vertex_ai.getGenerativeModel({
      model: this.imageModelName,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.3,
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
   * Genera imágenes, estampa LOGO y estampa TEXTO (Posicionable).
   */
  async generateImages({
    prompt,
    styleReferences = [],
    contentReferences = [],
    referenceImages = [],
    aspectRatio = "1:1",
    numberOfImages = 1,
  }) {
    const parts = [];

    // Normalización: Si el controller antiguo manda 'referenceImages', decidimos qué hacer.
    let styles = styleReferences;
    if (styles.length === 0 && referenceImages.length > 0 && contentReferences.length === 0) {
      styles = referenceImages;
    }

    // --- NUEVO: DETECCIÓN Y EXTRACCIÓN DE TEXTO Y POSICIÓN ---
    let textToRender = null;
    let textPosition = "arriba-centro"; // Default
    let cleanPrompt = prompt;

    // 1. Extraer Texto: TEXTO: "Hola Mundo"
    const textMatch = prompt.match(/TEXTO:\s*"([^"]+)"/i);
    if (textMatch) {
      textToRender = textMatch[1];
      cleanPrompt = cleanPrompt.replace(textMatch[0], ""); // Limpiamos el comando
    }

    // 2. Extraer Posición: POSICION: "abajo-derecha"
    const posMatch = prompt.match(/POSICION:\s*"([^"]+)"/i);
    if (posMatch) {
      textPosition = posMatch[1].toLowerCase().trim();
      cleanPrompt = cleanPrompt.replace(posMatch[0], ""); // Limpiamos el comando
    }

    cleanPrompt = cleanPrompt.trim(); // Limpieza final de espacios

    if (textToRender) {
      console.log(`[GeminiService] Config Texto -> Contenido: "${textToRender}", Posición: "${textPosition}"`);
    }

    // --- 1. INYECCIÓN DE ESTILO (Solo Inspiración) ---
    if (styles && styles.length > 0) {
      console.log(`[GeminiService] Inyectando referencias de ESTILO (Solo Inspiración).`);
      parts.push({
        text: `
          [VISUAL STYLE INSPIRATION]
          The following images define the desired VIBE, Color Palette, and Lighting (especially reddish tones).
          INSTRUCTION: Use these ONLY for atmospheric inspiration. Do NOT copy specific objects, layouts, or create a collage. 
          Capture the "mood" only.
        `,
      });
      const styleParts = await this._processReferenceImages(styles);
      parts.push(...styleParts);
    }

    // --- 2. INYECCIÓN DE CONTENIDO (Referencias del Usuario / Estructura) ---
    if (contentReferences && contentReferences.length > 0) {
      console.log(`[GeminiService] Inyectando referencias de ESTRUCTURA.`);
      parts.push({
        text: `[COMPOSITION GUIDANCE]: Use the structure and perspective of these images as a blueprint.`,
      });
      const contentParts = await this._processReferenceImages(contentReferences);
      parts.push(...contentParts);
    }

    // --- 3. EL PROMPT DEL USUARIO (Reforzado) ---
    let finalPromptText = `[GENERATION PROMPT]: ${cleanPrompt} \n\n[FINAL CHECK]: Ensure reddish gradients in lighting. NO TEXT, NO LOGOS written by AI.`;

    // Si hay texto para renderizar, pedimos espacio negativo según la posición solicitada
    if (textToRender) {
      if (textPosition.includes("arriba")) {
        finalPromptText += " VITAL: Leave the TOP 30% of the image empty (negative space) for text overlay.";
      } else if (textPosition.includes("abajo")) {
        finalPromptText += " VITAL: Leave the BOTTOM 30% of the image empty (negative space) for text overlay.";
      } else if (textPosition.includes("centro")) {
        finalPromptText += " VITAL: Keep the CENTER area relatively clean or with low contrast for text overlay.";
      }
    }

    // Agregar instrucción de Aspect Ratio
    if (aspectRatio && aspectRatio !== "1:1") {
      finalPromptText += `\n\n[Technical Specification]: Aspect Ratio ${aspectRatio}.`;
    }

    parts.push({ text: finalPromptText });

    // --- 4. EJECUCIÓN ---
    try {
      console.log("[GeminiService] 1. Generando imagen base limpia con IA...");
      const result = await this.imageModel.generateContent({
        contents: [{ role: "user", parts: parts }],
      });

      const response = await result.response;
      const candidates = response.candidates || [];
      const generatedBuffers = [];

      for (const candidate of candidates) {
        const cParts = candidate.content.parts || [];
        const imagePart = cParts.find((p) => p.inlineData);
        if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
          generatedBuffers.push(Buffer.from(imagePart.inlineData.data, "base64"));
        }
      }

      if (generatedBuffers.length === 0) {
        let textResponse = "";
        candidates[0]?.content?.parts?.forEach((p) => {
          if (p.text) textResponse += p.text;
        });
        throw new Error(
          `Gemini respondió solo texto: ${textResponse.substring(0, 150)}...`,
        );
      }

      // --- FASE 2: POST-PROCESAMIENTO ---
      console.log("[GeminiService] 2. Estampando logo oficial con Sharp...");
      let finalImages = await this._overlayBranding(generatedBuffers);

      // --- FASE 3: ESTAMPADO DE TEXTO (Si existe) ---
      if (textToRender) {
        console.log("[GeminiService] 3. Estampando texto dinámico...");
        finalImages = await this._overlayText(finalImages, textToRender, textPosition);
      }

      return finalImages;

    } catch (error) {
      console.error("[GeminiService] Error fatal en generateImages:", error);
      throw error;
    }
  }

  /**
   * Refina/Fusiona imágenes existentes basado en un prompt.
   * LÓGICA ADAPTATIVA (Objetos, Personas, Temática).
   */
  async refineImage(prompt, imageParts, referenceImages = []) {
    if (!imageParts || imageParts.length === 0) {
      throw new Error("Se requieren imágenes para refinar.");
    }

    // --- PROMPT "SMART ROUTER" ---
    let adaptivePrompt = `
      TASK: Edit the Primary Image (Image 1) based on the User Instructions.

      USER INSTRUCTIONS: "${prompt}"

      [INTELLIGENT EDITING LOGIC - FOLLOW STRICTLY]:
      1. SCENARIO A (Object Change): If user asks to change/remove props (screens, tables, items), you MUST PRESERVE the people and the room architecture exactly.
      2. SCENARIO B (People Change): If user asks to change the people (gender, action, clothing), you MUST PRESERVE the background/office and the lighting vibe.
      3. SCENARIO C (Theme Change): If user asks to change the style/theme, you may adapt the scene, BUT you must retain the core composition and camera angle.

      [IMMUTABLE BRAND RULES - NEVER BREAK THESE]:
      - LOGO SAFETY: The "Creativa Studios" logo in the corner MUST REMAIN VISIBLE. Do not crop it out or distort it into illegibility.
      - LIGHTING: The scene MUST maintain the signature reddish gradient lighting.
    `;

    const parts = [];
    parts.push({ text: adaptivePrompt });
    parts.push({ text: "[PRIMARY IMAGE TO EDIT]:" });
    parts.push(...imageParts);

    if (referenceImages && referenceImages.length > 0) {
      console.log(`[GeminiService] Añadiendo referencias para INSPIRACIÓN.`);
      parts.push({
        text: `
          [STYLE REFERENCES]: Use these only for color/lighting inspiration if the user asks for a theme change. 
          Do NOT copy objects from here unless requested.
          `
      });
      const refParts = await this._processReferenceImages(referenceImages);
      parts.push(...refParts);
    }

    const reqContent = {
      contents: [{ role: "user", parts }],
    };

    console.log(`[GeminiService] Ejecutando refinamiento ADAPTATIVO...`);

    try {
      const result = await this.imageModel.generateContent(reqContent);
      const response = await result.response;
      const candidate = response.candidates[0];
      const imagePart = candidate?.content?.parts?.find((p) => p.inlineData);
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
    } catch (error) {
      console.error("[GeminiService] Error en refineImage:", error);
      throw error;
    }
  }

  /**
   * Realiza Inpainting/Edición con MÁSCARA.
   */
  async editImageWithMask(
    prompt,
    imageBase64,
    maskBase64,
    referenceImages = [],
  ) {
    try {
      console.log(
        `[GeminiService] editImageWithMask Check. Prompt length: ${prompt.length}, Mask present: ${!!maskBase64}, Refs count: ${referenceImages?.length}`,
      );

      const manualPrompt = `
      [TASK]: Perform Inpainting/Editing on IMAGE 1 using MASK 1 (IMAGE 2).
      [GOAL]: ${prompt}
      [MASK INFO]: White areas = edit. Black areas = PRESERVE EXACTLY (including existing logos).
      
      [MANDATORY CONSTRAINTS]:
      1. Ensure the edited area integrates seamlessly with reddish gradient lighting.
      2. Do NOT touch anything outside the white mask area.
      
      ${referenceImages.length > 0 ? "[STYLE REFERENCES (SECONDARY)]: The subsequent images are for atmospheric inspiration only for the edited area. Do NOT copy their content." : ""}
      `;

      const parts = [
        { text: manualPrompt },
        { inlineData: { mimeType: "image/png", data: imageBase64 } },
        { inlineData: { mimeType: "image/png", data: maskBase64 } },
      ];

      if (referenceImages && referenceImages.length > 0) {
        referenceImages.forEach((refBase64) => {
          const cleanRef = refBase64.replace(/^data:image\/\w+;base64,/, "");
          parts.push({ inlineData: { mimeType: "image/png", data: cleanRef } });
        });
      }

      const genConfig = {
        candidateCount: 1,
        maxOutputTokens: 2048,
        temperature: 0.25,
      };

      const result = await this.imageModel.generateContent({
        contents: [{ role: "user", parts: parts }],
        generationConfig: genConfig,
      });

      const response = await result.response;
      const candidate = response.candidates[0];
      const imagePart = candidate?.content?.parts?.find((p) => p.inlineData);
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
        throw new Error(
          `Gemini no generó imagen. Respuesta texto: ${textResponse}`,
        );
      }
    } catch (error) {
      console.error("[GeminiService] Error en editImageWithMask:", error);
      throw error;
    }
  }

  /**
   * Método privado para estampar el logo usando Sharp.
   */
  async _overlayBranding(imageBuffers) {
    try {
      const logoBuffer = await fs.readFile(LOGO_PATH);

      const processedPromises = imageBuffers.map(async (inputBuffer) => {
        const metadata = await sharp(inputBuffer).metadata();
        const baseWidth = metadata.width;

        const targetLogoWidth = Math.round(baseWidth * 0.20);
        const resizedLogo = await sharp(logoBuffer).resize({ width: targetLogoWidth }).toBuffer();
        const margin = Math.round(baseWidth * 0.04);

        return await sharp(inputBuffer)
          .composite([{
            input: resizedLogo,
            gravity: 'northwest',
            top: margin,
            left: margin,
            blend: 'over'
          }])
          .png()
          .toBuffer();
      });

      return Promise.all(processedPromises);
    } catch (error) {
      console.warn(`[GeminiService] ⚠️ ALERTA: Falló el estampado del logo (${error.message}). Devolviendo imagen base.`);
      return imageBuffers;
    }
  }

  /**
   * Método privado para estampar TEXTO DINÁMICO.
   */
  async _overlayText(imageBuffers, text, position = "arriba-centro") {
    try {
      await fs.access(FONT_PATH);

      return Promise.all(imageBuffers.map(async (inputBuffer) => {
        const metadata = await sharp(inputBuffer).metadata();
        const width = metadata.width;
        const height = metadata.height;

        // Configuración base de fuente
        const fontSize = Math.round(width * 0.07); // 7% del ancho

        // Mapa de Posiciones (Coordenadas y Anclas)
        // x, y en porcentajes. text-anchor: start (izq), middle (cen), end (der).
        const posMap = {
          "arriba-izquierda": { x: "5%", y: "15%", anchor: "start" },
          "arriba-centro": { x: "50%", y: "15%", anchor: "middle" },
          "arriba-derecha": { x: "95%", y: "15%", anchor: "end" },
          "centro": { x: "50%", y: "50%", anchor: "middle" },
          "abajo-izquierda": { x: "5%", y: "90%", anchor: "start" },
          "abajo-centro": { x: "50%", y: "90%", anchor: "middle" },
          "abajo-derecha": { x: "95%", y: "90%", anchor: "end" }
        };

        // Obtener configuración o usar default
        const config = posMap[position] || posMap["arriba-centro"];

        const svgText = `
                <svg width="${width}" height="${height}">
                    <style>
                        .title { 
                            fill: white; 
                            font-family: "CustomFont"; 
                            font-size: ${fontSize}px; 
                            font-weight: bold;
                            text-shadow: 2px 2px 8px rgba(0,0,0,0.8);
                        }
                    </style>
                    <defs>
                        <font-face font-family="CustomFont">
                            <font-face-src>
                                <font-face-uri xlink:href="${FONT_PATH}"/>
                            </font-face-src>
                        </font-face>
                    </defs>
                    <text x="${config.x}" y="${config.y}" text-anchor="${config.anchor}" class="title">${text}</text>
                </svg>
            `;

        return await sharp(inputBuffer)
          .composite([{ input: Buffer.from(svgText), blend: 'over' }])
          .png().toBuffer();
      }));
    } catch (error) {
      console.error(`[GeminiService] ⚠️ Error estampando texto: ${error.message}`);
      return imageBuffers;
    }
  }

  /**
   * Helper privado para descargar/leer referencias.
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