import ImageGeneratorPort from "../../../application/ports/ImageGeneratorPort.js";
import genAI from "./genAiClient.js";
import axios from "axios";

class GeminiImageAdapter extends ImageGeneratorPort {
  #prepareContent(prompt, images = []) {
    return [{ text: prompt }, ...images];
  }

  async #downloadAndPrepareImage(imageURL) {
    try {
      // Check if it's a data URL (base64)
      if (imageURL.startsWith("data:")) {
        const [header, base64Data] = imageURL.split(",");
        const mimetype = header.split(":")[1].split(";")[0];

        return {
          inlineData: {
            mimeType: mimetype,
            data: base64Data,
          },
        };
      }

      // If it's a regular URL, download it
      const response = await axios.get(imageURL, {
        responseType: "arraybuffer",
      });
      const buffer = Buffer.from(response.data);
      const mimetype = response.headers["content-type"];

      return {
        inlineData: {
          mimeType: mimetype,
          data: buffer.toString("base64"),
        },
      };
    } catch (error) {
      throw new Error(`Failed to download or prepare image: ${error.message}`);
    }
  }

  #extractDataFromResponse(response) {
    // Validate response structure
    if (!response || !response.candidates || response.candidates.length === 0) {
      console.error("Gemini API Error (No candidates):", JSON.stringify(response, null, 2));
      throw new Error("Generación rechazada por Gemini (posible bloqueo de seguridad) o error interno de la API.");
    }

    const candidate = response.candidates[0];

    // Validate content structure
    if (!candidate.content || !candidate.content.parts || !Array.isArray(candidate.content.parts)) {
      console.error("Gemini API Error (Invalid structure):", JSON.stringify(candidate, null, 2));
      if (candidate.finishReason && candidate.finishReason !== "STOP") {
        throw new Error(`Generación detenida por Gemini. Motivo: ${candidate.finishReason}`);
      }
      throw new Error("Gemini retornó una estructura inesperada (content.parts no es iterable).");
    }

    for (const part of candidate.content.parts) {
      if (part.text) {
        throw new Error("Text response received");
      } else if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        const mimeType = part.inlineData.mimeType;
        return { buffer, mimeType };
      }
    }

    throw new Error('Gemini no devolvió datos de imagen. Puede que el prompt haya sido rechazado por políticas de seguridad.');
  }

  // --- CAMBIO v2.0: Recibimos resolution como sexto parámetro ---
  async generateImages(prompt, config, numberOfImages, referenceImageURLs = null, referenceType = 'style', resolution = '1080x1080') {
    let requestContents = [{ text: prompt }];

    // Fallback de aspectRatio derivado de la resolución
    let fallbackAspectRatio = "1:1";
    if (resolution === "1080x1920") {
      fallbackAspectRatio = "9:16";
    } else if (resolution === "1920x1080") {
      fallbackAspectRatio = "16:9";
    }

    // Priorizamos el aspectRatio que manda el frontend (independiente de la resolución).
    // Si el frontend no manda uno, lo derivamos de la resolución como fallback.
    const aspectRatio = config?.imageConfig?.aspectRatio || fallbackAspectRatio;

    // Mapeamos el imageSize al formato que acepta la API de Gemini: "1K", "2K", "4K"
    // El frontend puede mandar el valor directamente ("2K", "4K") o un string de resolución.
    const rawImageSize = config?.imageConfig?.imageSize;
    let imageSize = "1K"; // Default para resoluciones 1080p
    if (rawImageSize) {
      const normalized = String(rawImageSize).toUpperCase();
      if (normalized === "4K" || normalized.includes("4K")) {
        imageSize = "4K";
      } else if (normalized === "2K" || normalized.includes("2K")) {
        imageSize = "2K";
      } else {
        // Para cualquier otro valor (ej: "1080x1080"), usamos 1K
        imageSize = "1K";
      }
    }

    // Construimos el config limpio solo con los campos que Gemini acepta.
    // IMPORTANTE: aspectRatio e imageSize van dentro de imageConfig, no en el nivel raíz.
    const generationConfig = {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: imageSize,
      },
    };




    // Si hay imágenes de referencia, las descargamos y preparamos
    if (referenceImageURLs) {
      const referenceImagesUrlsArray = Array.isArray(referenceImageURLs) ? referenceImageURLs : [referenceImageURLs];

      const preparedImages = await Promise.all(
        referenceImagesUrlsArray.filter(url => url).map(url => this.#downloadAndPrepareImage(url))
      );

      if (preparedImages.length > 0) {
        // Adjuntamos el texto y las imágenes en el arreglo de contenidos

        let contextualPrompt = prompt;
        if (referenceType === 'subject') {
          contextualPrompt = `[Instrucción estricta: Mantén el SUJETO o OBJETO de las imágenes proporcionadas exactamente igual en identidad, pero colócalo en esta nueva situación]\n\n${prompt}`;
        } else {
          contextualPrompt = `[Instrucción estricta: Usa las imágenes proporcionadas como REFERENCIA DE ESTILO, paleta de colores o estética visual para esta solicitud]\n\n${prompt}`;
        }

        requestContents = this.#prepareContent(contextualPrompt, preparedImages);
      }
    }

    const data = {
      model: "gemini-3-pro-image-preview",
      contents: requestContents,
      config: generationConfig,
    };



    try {
      if (!numberOfImages || numberOfImages === 1) {
        const response = await genAI.models.generateContent(data);
        return [this.#extractDataFromResponse(response)];
      } else if (numberOfImages > 1) {
        const responses = await Promise.all(
          Array.from({ length: numberOfImages }, () =>
            genAI.models.generateContent(data),
          ),
        );
        const images = responses.map((r) => this.#extractDataFromResponse(r));
        return images;
      }
    } catch (apiError) {
      throw apiError;
    }
  }

  async editImage(
    baseImageURL,
    referenceImageURLs,
    maskImageURL,
    prompt,
    config,
  ) {
    const referenceImages = Array.isArray(referenceImageURLs)
      ? referenceImageURLs
      : [referenceImageURLs];

    const imageUrls = [baseImageURL, ...referenceImages, maskImageURL].filter(
      (url) => url,
    );

    const images = await Promise.all(
      imageUrls.map((url) => this.#downloadAndPrepareImage(url)),
    );

    // Config limpio igual que en generateImages: aspectRatio de frontend o "1:1" por defecto.
    // Evita INVALID_ARGUMENT por parámetros extra que Gemini no acepta.
    const aspectRatio = config?.imageConfig?.aspectRatio || "1:1";
    const editConfig = {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: aspectRatio,
      },
    };

    const data = {
      model: "gemini-3-pro-image-preview",
      contents: this.#prepareContent(prompt, images),
      config: editConfig,
    };

    const response = await genAI.models.generateContent(data);
    return [this.#extractDataFromResponse(response)];
  }
}
export default GeminiImageAdapter;