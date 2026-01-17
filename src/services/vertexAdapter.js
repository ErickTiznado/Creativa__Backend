/**
 * ------------------------------------------------------------------
 * Archivo: vertexAdapter.js
 * Ubicación: src/services/vertexAdapter.js
 * Responsabilidad: Wrapper de alto nivel para consumir Vertex AI (texto, streaming, imagen)
 * y persistir imágenes en Cloud Storage.
 *
 * Nota: este archivo mezcla varios estilos/nombres (typos y nombres de params).
 * Los comentarios aquí describen la intención para facilitar refactors futuros.
 * ------------------------------------------------------------------
 */

import { PredictionServiceClient, helpers } from "@google-cloud/aiplatform";
import { Storage } from "@google-cloud/storage";
import axios from "axios";
import config from "../config/index.js";

class vertexAdapter {
  constructor() {
    this.predictionClient = new PredictionServiceClient({
      apiEndpoint: `${config.gcp.location}-aiplatform.googleapis.com`,
      keyFilename: config.gcp.keyFilePath,
    });
    //cliente de almacenamiento en la nuve
    this.Storage = new Storage({
      projectId: config.gcp.projectId,
      keyFilename: config.gcp.keyFilePath,
    });
    //referencias al bucket a utilizar
    this.bucket = this.Storage.bucket(config.gcp.storage.bucketName);
    this.projectId = config.gcp.projectId;
    this.location = config.gcp.location;
  }
  /**
   * Generación de texto (Gemini) vía PredictionService.
   */
  async generateText(prompt, opcions = {}) {
    try {
      const endPoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/geminiPro`;

      const instanceValue = {
        content: prompt,
      };
      const instances = [instanceValue];

      const parameter = helpers.toValue({
        temperature: opcions.temperature || 0.7,
        maxOutputTokens: opcions.maxOutputTokens || 2048,
        topP: opcions.topP || 0.95,
        topK: opcions.topK || 40,
      });

      const parameters = parameter;

      const request = {
        endPoint,
        instances,
        parameters,
      };

      console.log("Llamando al modelo de IA generativa ");
      const [respuesta] = await this.predictionClient.predict(request);

      const predictions = respuesta.predictions;

      if (predictions && predictions.length > 0) {
        const prediction = predictions[0];
        const content =
          prediction.structValue?.fields?.content?.stringValue ||
          prediction.stringValue?.fields?.candidates?.listValue?.values?.[0]
            ?.structValue?.fields?.content?.stringValue ||
          "No fue posible generar contenido en la petición";
        console.log("Texto generado");
        return content;
      }
      throw new Error("No se recibió respuesta del modelo");
    } catch (error) {
      console.error("Error en la generacion de texto:", error);
      throw new Error("No se recibió respuesta del modelo");
    }
  }
  /**
   * Generación de texto en streaming. Llama `onChunk` por fragmento.
   */
  async generateTextStream(prompt, onChunk, opcions = {}) {
    try {
      const endpoint = `projects/${this.projectld}/locations/${this.location}/publishers/google/models/${config.gcp.models.geminiPro}:streamGenerateContent'`;
      const instanceValue = helpers.toValue({
        content: prompt,
      });

      const request = {
        endpoint,
        instances: [instanceValue],
        parameters: helpers.toValue({
          temperature: opcions?.temperature || 0.7,
          maxOutputTokens: opcions?.maxOutputTokens || 2048,
        }),
      };

      //iniciando el stream
      const streamResponse = await this.predictionClient.streamPredict(request);
      for await (const response of streamResponse) {
        if (response.predictions && response.predictions.length > 0) {
          const chunk =
            response.predictions[0].structValue?.fields?.content?.stringValue ||
            "";
          if (chunk && onChunk) {
            onChunk(chunk);
          }
        }
      }
      console.log("Stream de texto finalizado");
    } catch (error) {
      console.error("Error Stream: ", error);
    }
  }
  /**
   * Generación de imagen (Imagen 2) y subida a Cloud Storage.
   */
  async imageGeneration(prompt, opcions = {}) {
    try {
      const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${config.gcp.models.imagen2}`;

      const instanceValue = helpers.toValue({
        prompt: prompt,
      });
      const parameters = helpers.toValues({
        simpleCount: opcions.simpleCount || 1,
        aspectRatio: opcions.aspectRatio || "16:9",
        negativePrompt: opcions.negativePrompt || "",
      });
      const request = {
        endpoint,
        instances: [instanceValue],
        parameters,
      };
      console.log("generando...");
      const [response] = await this.predictionClient.predict(request);
      if (!response.predictions || response.predictions.length === 0) {
        throw new Error("No fue posible generar la imagen");
      }
      const predictions = response.predictions;
      const image = [];
      for (const predic of predictions) {
        const imageBase64 =
          predic.structValue?.fields?.bytesBase64?.stringValue;
        if (imageBase64) {
          const filname = `campaign_${Date.now()}${Math.random()
            .toString(36)
            .substring(7)}.png`;
          const imageURL = await this.uploadImageToStorage(
            imageBase64,
            filname,
            opcions.folder || "campaigns"
          );
          image.push({
            url: imageURL,
            filename: filname,
            prompt: prompt,
            aspectRatio: opcions.aspectRatio || "16:9",
            generatedAT: new Date().toISOString(),
          });
        }
      }
      return image.length === 1 ? image[0] : image;
    } catch (error) {
      console.error("Error en la generacion de imagenes: ", error);
    }
  }
  /**
   * Edición de imagen (Imagen 2). Requiere URL de imagen base y máscara.
   */
  async editImage(baseImageURL, promt, opcions = {}) {
    try {
      const baseImageBase64 = await this.downloadImageAsBase64(baseImageUrl);
      const maskImageBase64 = await this.downloadImageAsBase64(maskImageUrl);

      const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${config.gcp.models.imagen2}:editImage`;
      const instanceValue = helpers.toValue({
        prompt: prompt,
        image: {
          bytesBase64Encoded: baseImageBase64,
        },
        mask: {
          bytesBase64Encoded: maskImageBase64,
        },
      });
      const request = {
        endpoint,
        instances: [instanceValue],
        parameters: helpers.toValue({
          sampleCount: 1,
          ...options,
        }),
      };

      //comienza la edicion de la imagen
      const [response] = await this.predictionClient.predict(request);

      const imageBase64 =
        response.predictions[0]?.structValue?.fields?.bytesBase64Encoded
          ?.stringValue;

      if (imageBase64) {
        const filename = `edited-${Date.now()}.png`;
        const imageUrl = await this.uploadImageToStorage(
          imageBase64,
          filename,
          "campaigns"
        );
        //resultado de la edicion
        return {
          url: imageUrl,
          filname: filname,
          promt: promt,
          editedAT: new Date().toISOString(),
        };
      }
      throw new Error("No se pudo editar la imagen");
    } catch (error) {
      console.error("Error en la edicion de imagenes: ", error);
    }
  }
  /**
   * Guarda un PNG (base64) en Cloud Storage y devuelve la URL pública.
   */
  async uploadImageToStorage(base64Image, filename, folder) {
    try {
      const buffer = Buffer.from(base64Image, "base64");
      const filePath = `${folder}/${filename}`;
      const file = this.bucket.file(filePath);

      await file.save(buffer, {
        metadata: {
          contentType: "image/png",
          metadata: {
            uploadedAt: new Date().toISOString(),
            source: "vertex-ai-imagen2",
          },
        },
        public: true,
      });

      const publicUrl = `${config.gcp.storage.publicUrl}/${filePath}`;
      return publicUrl;
    } catch (error) {
      console.error("error al subir la imagen al storage: ", error);
    }
  }

  /**
   * Descarga una imagen remota y la convierte a base64.
   */
  async downloadImageAsBase64(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      const base64 = Buffer.from(response.data, "binary").toString("base64");
      return base64;
    } catch (error) {
      console.error("Error: ", error);
    }
  }

  /**
   * Analiza una imagen con un prompt (Gemini Vision).
   */
  async analyzelimage(imageUrl, question = 'Describe la imagen') {
    try {
        const imageBae64 = await this.downloadImageAsBase64(imageUrl)
        const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/gemini-pro-vision`;
        const instanceValue = helpers.toValue({
            content: question,
            image: {
                bytesBase64Encoded: imageBae64
            }

        })
        const request = {
        endpoint,
        instances: [instanceValue],
        parameters: helpers.toValue({
          temperature: 0.4,
          maxOutputTokens: 1024,
        })
    }
    //comienza el analisis de la imagen
    const analysis = response.predictions[0]?.structValue?.fields?.content?.stringValue;
    
    return analysis;

    } catch (error) {
        console.error("Error ", error)
    }
}
}

export default vertexAdapter;
