import ImageGeneratorPort from "../../../application/ports/ImageGeneratorPort.js";
import genAI from "./genAiClient.js";
import axios from "axios";

class GeminiImageAdapter extends ImageGeneratorPort {
  
  // Helper to prepare content for editing (prompt + images)
  #prepareContent(prompt, images) {
    // Structure for gemini-3-pro-image-preview editing:
    // contents: [ { role: 'user', parts: [ { text: prompt }, { inlineData: image1 }, { inlineData: mask } ] } ]
    // Verify order: usually prompt, then base image, then mask image? Or just parts.
    
    const parts = [
      { text: prompt }
    ];

    // Append images (which are already in { inlineData: ... } format from #downloadAndPrepareImage)
    if (images && Array.isArray(images)) {
      images.forEach(img => {
        if (img.inlineData) {
          parts.push(img);
        }
      });
    }

    return [{
      role: "user",
      parts: parts
    }];
  }

  async #downloadAndPrepareImage(imageURL) {
    try {
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
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  // Helper method to verify response structure if needed
  #extractDataFromResponse(response) {
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No candidates returned from Gemini API");
    }
    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts) {
       throw new Error("Invalid response structure from Gemini API");
    }

    for (const part of candidate.content.parts) {
      if (part.text) {
        console.warn("Parte de respuesta de texto:", part.text);
      } else if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        const mimeType = part.inlineData.mimeType;
        return { buffer, mimeType };
      }
    }
    throw new Error("No image data found in response");
  }

  async generateImages(prompt, config, numberOfImages) {
    const model = "gemini-3-pro-image-preview"; 

    const requestConfig = {
      imageConfig: {
        aspectRatio: config.aspectRatio || "16:9",
      }
    };

    const data = {
      model: model,
      contents: prompt,
      config: requestConfig
    };

    if (!numberOfImages || numberOfImages === 1) {
      console.log(`Enviando petición a la API de Gemini (${model})...`);
      const response = await genAI.models.generateContent(data);
      console.log("Respuesta de Gemini recibida.");
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

  async editImage(baseImageURL, maskImageURL, prompt, config) {
    // Download and prepare images
    const images = [
      await this.#downloadAndPrepareImage(baseImageURL),
      await this.#downloadAndPrepareImage(maskImageURL),
    ];

    const model = "gemini-3-pro-image-preview";
    
    // Config for editing might differ, but assuming similar structure
    const requestConfig = {
      imageConfig: {
        // Editing might ignore aspect ratio if maintaining original, but let's pass if present
        ...(config.aspectRatio && { aspectRatio: config.aspectRatio }),
      }
    };

    const contents = this.#prepareContent(prompt, images);

    const data = {
      model: model,
      contents: contents,
      config: requestConfig
    };

    console.log(`Enviando petición de edición a la API de Gemini (${model})...`);
    const response = await genAI.models.generateContent(data);
    console.log("Respuesta de edición de Gemini recibida.");

    return [this.#extractDataFromResponse(response)];
  }
}

export default GeminiImageAdapter;
