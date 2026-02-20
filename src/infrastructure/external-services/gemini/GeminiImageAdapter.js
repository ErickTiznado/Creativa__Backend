import ImageGeneratorPort from "../../../application/ports/ImageGeneratorPort.js";
import genAI from "./genAiClient.js";
import axios from "axios";

class GeminiImageAdapter extends ImageGeneratorPort {
  #prepareContent(prompt, images = []) {
    return [{ text: prompt }, ...images];
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

  #extractDataFromResponse(response) {
    for (const part of response.candidates[0].content.parts) {
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

  async generateImages(prompt, config, numberOfImages) {
    const data = {
      model: "gemini-3-pro-image-preview",
      contents: prompt,
      config: config,
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
      model: "gemini-3.0-pro-image-preview",
      contents: this.#prepareContent(prompt, images),
      config: config,
    };

    const response = await genAI.models.generateContent(data);
    return [this.#extractDataFromResponse(response)];
  }
}
export default GeminiImageAdapter;
