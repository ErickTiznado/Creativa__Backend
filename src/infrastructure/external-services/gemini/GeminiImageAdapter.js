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
  }

  async generateImages(prompt, config, numberOfImages, referenceImageURLs = null, referenceType = 'style') {
    let requestContents = [{ text: prompt }];
    let generationConfig = config || {};

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

    const data = {
      model: "gemini-3-pro-image-preview",
      contents: this.#prepareContent(prompt, images),
      config: config,
    };

    const response = await genAI.models.generateContent(data);
    return [this.#extractDataFromResponse(response)];
  }
}
export default GeminiImageAdapter;
