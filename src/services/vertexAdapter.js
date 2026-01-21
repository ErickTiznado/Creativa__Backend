/**
 * ------------------------------------------------------------------
 * Archivo: vertexAdapter.js
 * Ubicación: src/services/vertexAdapter.js
 * Responsabilidad: Wrapper de alto nivel para consumir Vertex AI (texto, streaming, imagen)
 * y persistir imágenes en Cloud Storage.
 *
 * Módulos:
 * - PredictionServiceClient: Para generar texto e imágenes.
 * - Storage: Para guardar las imágenes generadas.
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
    // Cliente de Google Cloud Storage
    this.Storage = new Storage({
      projectId: config.gcp.projectId,
      keyFilename: config.gcp.keyFilePath,
    });
    // Referencia al bucket configurado
    this.bucket = this.Storage.bucket(config.gcp.storage.bucketName);
    this.projectId = config.gcp.projectId;
    this.location = config.gcp.location;
  }

  /**
   * Genera texto usando un modelo generativo (ej. Gemini Pro).
   * @param {string} prompt - Prompt para el modelo.
   * @param {Object} options - Opciones de configuración (temperature, tokens, etc.).
   * @returns {Promise<string>} - Texto generado.
   */
  async generateText(prompt, options = {}) {
    try {
      const endPoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/geminiPro`;

      const instanceValue = {
        content: prompt,
      };
      const instances = [instanceValue];

      const parameter = helpers.toValue({
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxOutputTokens || 2048,
        topP: options.topP || 0.95,
        topK: options.topK || 40,
      });

      const parameters = parameter;

      const request = {
        endPoint,
        instances,
        parameters,
      };

      const [respuesta] = await this.predictionClient.predict(request);

      const predictions = respuesta.predictions;

      if (predictions && predictions.length > 0) {
        const prediction = predictions[0];
        const content =
          prediction.structValue?.fields?.content?.stringValue ||
          prediction.stringValue?.fields?.candidates?.listValue?.values?.[0]
            ?.structValue?.fields?.content?.stringValue ||
          "No fue posible generar contenido en la petición";
        return content;
      }
      throw new Error("No se recibió respuesta del modelo");
    } catch (error) {
      console.error("Error en la generacion de texto:", error);
      throw new Error("No se recibió respuesta del modelo");
    }
  }

  /**
   * Genera texto en modo streaming.
   * @param {string} prompt - Prompt de entrada.
   * @param {Function} onChunk - Callback que se ejecuta con cada fragmento de texto recibido.
   * @param {Object} options - Configuración de generación.
   */
  async generateTextStream(prompt, onChunk, options = {}) {
    try {
      // Corregido: this.projectld -> this.projectId
      const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${config.gcp.models.geminiPro}:streamGenerateContent`;
      const instanceValue = helpers.toValue({
        content: prompt,
      });

      const request = {
        endpoint,
        instances: [instanceValue],
        parameters: helpers.toValue({
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxOutputTokens || 2048,
        }),
      };

      // Iniciando el stream
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
    } catch (error) {
      console.error("Error Stream: ", error);
    }
  }

  /**
   * Genera una imagen (Imagen 2) y la sube a Cloud Storage.
   * @param {string} prompt - Descripción de la imagen.
   * @param {Object} options - Opciones (aspectRatio, negativePrompt, etc.).
   * @returns {Promise<Object|Object[]>} - Metadatos de la(s) imagen(es) generada(s).
   */
  async imageGeneration(prompt, options = {}) {
    try {
      const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${config.gcp.models.imagen2}`;

      const instanceValue = helpers.toValue({
        prompt: prompt,
      });
      const parameters = helpers.toValue({
        sampleCount: options.sampleCount || 1,
        aspectRatio: options.aspectRatio || "16:9",
        negativePrompt: options.negativePrompt || "",
      });
      const request = {
        endpoint,
        instances: [instanceValue],
        parameters,
      };
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
          const filename = `campaign_${Date.now()}${Math.random()
            .toString(36)
            .substring(7)}.png`;
          const imageURL = await this.uploadImageToStorage(
            imageBase64,
            filename,
            options.folder || "campaigns",
          );
          image.push({
            url: imageURL,
            filename: filename,
            prompt: prompt,
            aspectRatio: options.aspectRatio || "16:9",
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
   * Edita una imagen existente usando un prompt y una máscara (opcional).
   * @param {string} baseImageUrl - URL de la imagen original.
   * @param {string} prompt - Instrucción de edición.
   * @param {Object} options - Opciones adicionales.
   */
  async editImage(baseImageUrl, prompt, options = {}) {
    try {
      const baseImageBase64 = await this.downloadImageAsBase64(baseImageUrl);
      // TODO: Validar si maskImageBase64 es necesario o si viene en options
      // const maskImageBase64 = await this.downloadImageAsBase64(maskImageUrl);

      const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${config.gcp.models.imagen2}:editImage`;

      // Nota: La estructura instanceValue depende de si hay máscara o no.
      // Se asume implementación pendiente o incompleta en el código original.
      const instanceValue = helpers.toValue({
        prompt: prompt,
        image: {
          bytesBase64Encoded: baseImageBase64,
        },
        // mask: { bytesBase64Encoded: maskImageBase64 }, // Descomentar si se usa
      });

      const request = {
        endpoint,
        instances: [instanceValue],
        parameters: helpers.toValue({
          sampleCount: 1,
          ...options,
        }),
      };

      // Comienza la edición de la imagen
      const [response] = await this.predictionClient.predict(request);

      const imageBase64 =
        response.predictions[0]?.structValue?.fields?.bytesBase64Encoded
          ?.stringValue;

      if (imageBase64) {
        const filename = `edited-${Date.now()}.png`;
        const imageUrl = await this.uploadImageToStorage(
          imageBase64,
          filename,
          "campaigns",
        );
        // Resultado de la edición
        return {
          url: imageUrl,
          filename: filename,
          prompt: prompt,
          editedAT: new Date().toISOString(),
        };
      }
      throw new Error("No se pudo editar la imagen");
    } catch (error) {
      console.error("Error en la edicion de imagenes: ", error);
    }
  }

  /**
   * Sube una imagen en base64 a Cloud Storage y la hace pública.
   * @param {string} base64Image - Contenido de la imagen.
   * @param {string} filename - Nombre del archivo.
   * @param {string} folder - Carpeta destino en bucket.
   * @returns {Promise<string>} - URL pública de la imagen.
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
      console.error("Error al subir la imagen al storage: ", error);
    }
  }

  /**
   * Descarga una imagen desde una URL y la devuelve en base64.
   * @param {string} imageUrl
   * @returns {Promise<string>}
   */
  async downloadImageAsBase64(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      const base64 = Buffer.from(response.data, "binary").toString("base64");
      return base64;
    } catch (error) {
      console.error("Error descargando imagen: ", error);
    }
  }

  /**
   * Analiza una imagen con un prompt (Gemini Vision).
   * @param {string} imageUrl - URL de la imagen a analizar.
   * @param {string} question - Pregunta sobre la imagen.
   */
  async analyzelimage(imageUrl, question = "Describe la imagen") {
    try {
      const imageBase64 = await this.downloadImageAsBase64(imageUrl);
      const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/gemini-pro-vision`;

      const instanceValue = helpers.toValue({
        content: question,
        image: {
          bytesBase64Encoded: imageBase64,
        },
      });

      const request = {
        endpoint,
        instances: [instanceValue],
        parameters: helpers.toValue({
          temperature: 0.4,
          maxOutputTokens: 1024,
        }),
      };

      // Comienza el análisis de la imagen
      const [response] = await this.predictionClient.predict(request); // Corregido: faltaba await y referencia a response
      const analysis =
        response.predictions[0]?.structValue?.fields?.content?.stringValue;

      return analysis;
    } catch (error) {
      console.error("Error en analysis de imagen: ", error);
    }
  }
}

export default vertexAdapter;
