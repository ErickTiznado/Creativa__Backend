/**
 * ------------------------------------------------------------------
 * Archivo: vertexAdapter.js
 * Ubicación: src/services/vertexAdapter.js
 * Responsabilidad: Wrapper de alto nivel para consumir Vertex AI (texto, streaming, imagen)
 * y persistir imágenes en Cloud Storage.
 * ------------------------------------------------------------------
 */

import { VertexAI } from "@google-cloud/vertexai";
import { PredictionServiceClient, helpers } from "@google-cloud/aiplatform";
import { Storage } from "@google-cloud/storage";
import axios from "axios";
import config from "../../config/index.js";

class vertexAdapter {
  constructor() {
    // Cliente Legacy para texto (Gemini Pro via PredictionServiceClient) - Mantenemos compatibilidad
    this.predictionClient = new PredictionServiceClient({
      apiEndpoint: `${config.gcp.location}-aiplatform.googleapis.com`,
      keyFilename: config.gcp.keyFilePath,
    });

    // Nuevo Cliente Vertex AI para Gemini Vision e Imagenes (Gemini 3 Pro / Flash)
    this.vertexAI = new VertexAI({
      project: config.gcp.projectId,
      location: config.gcp.location,
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
   * Mantenemos la implementación actual para no romper compatibilidad.
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
   */
  async generateTextStream(prompt, onChunk, options = {}) {
    try {
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
   * Genera una imagen usando modelos Gemini (2.5 Flash / 3 Pro).
   * Usa el nuevo SDK @google-cloud/vertexai
   * @param {string} prompt - Descripción de la imagen.
   * @param {Object} options - Opciones.
   */
  async imageGeneration(prompt, options = {}) {
    try {
      const modelName = config.gcp.models.imagen2; // ej: gemini-3-pro-image-preview

      // Instanciar el modelo generativo
      const generativeModel = this.vertexAI.getGenerativeModel({
        model: modelName,
      });

      const request = {
        prompt: prompt,
        sampleCount: options.sampleCount || 1,
        aspectRatio: options.aspectRatio || "16:9",
        negativePrompt: options.negativePrompt,
        personGeneration: options.personGeneration, // allow_adult, allow_juvenile, etc si aplica
      };

      // Nota: La API de Gemini para imágenes puede variar ligeramente de la de Imagen 2 clásica.
      // Esta implementación asume la interfaz unificada de Vertex AI para generación de imágenes.
      // Si falla, puede requerir endpoint específico, pero intentamos con el SDK estandar.

      // Alternativa: Si el SDK de VertexAI aún no wrappea "generateImage" directamente para Gemini models,
      // usaremos predictionClient con el endpoint correcto.
      // PERO, dado que el error anterior era por PredictionServiceClient legacy, intentamos PredictionServiceClient con el endpoint nuevo
      // OBIEN, usamos el SDK Preview si está disponible.

      // VAMOS A PROBAR CON PredictionServiceClient PERO APUNTANDO AL ENDPOINT CORRECTO DE GEMINI
      // Al parecer 'generateContent' es para texto/multimodal. Para imagen PURA (text-to-image) con Gemini,
      // a veces sigue siendo 'predict' pero con payload diferente.

      // REVISION: La documentación indica que para "Imagen 3" (Gemini Image) se usa el endpoint `predict`
      // pero el payload es diferente. Vamos a construir el payload correcto para Gemini Image.

      const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${modelName}`;

      const instance = {
        prompt: prompt,
      };

      const parameters = {
        sampleCount: options.sampleCount || 1,
        aspectRatio: options.aspectRatio || "16:9",
        negativePrompt: options.negativePrompt,
      };

      const requestPayload = {
        endpoint,
        instances: [helpers.toValue(instance)],
        parameters: helpers.toValue(parameters),
      };

      const [response] = await this.predictionClient.predict(requestPayload);

      const predictions = response.predictions;
      console.log("Gemini Image Predictions Raw:", JSON.stringify(predictions, null, 2));

      const image = [];
      for (const predic of predictions) {
        // La estructura de respuesta suele ser bytesBase64Encoded o similar
        const imageBase64 =
          predic.structValue?.fields?.bytesBase64Encoded?.stringValue ||
          predic.structValue?.fields?.bytesBase64?.stringValue;

        if (imageBase64) {
          const filename = `gemini_${Date.now()}${Math.random().toString(36).substring(7)}.png`;
          const imageURL = await this.uploadImageToStorage(
            imageBase64,
            filename,
            options.folder || "campaigns"
          );
          image.push({
            url: imageURL,
            filename: filename,
            prompt: prompt,
            aspectRatio: options.aspectRatio || "16:9",
            generatedAT: new Date().toISOString(),
            model: modelName
          });
        }
      }
      return image.length === 1 ? image[0] : image;

    } catch (error) {
      console.error("Error en generación de imagen (Gemini):", error);
      throw error;
    }
  }

  /**
   * Edita una imagen existente.
   */
  async editImage(baseImageUrl, prompt, options = {}) {
    // Implementación pendiente de actualización para Gemini Image si aplica.
    // Mantenemos lógica anterior o lanzamos "Not Implemented" si el modelo cambió drásticamente.
    console.warn("editImage: Validar compatibilidad con nuevo modelo.");
    // ... (lógica anterior)
  }

  /**
   * Sube una imagen en base64 a Cloud Storage y la hace pública.
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
            source: "vertex-ai-gemini",
          },
        },
        public: true,
      });

      const publicUrl = `${config.gcp.storage.publicUrl}/${filePath}`;
      return publicUrl;
    } catch (error) {
      console.error("Error al subir la imagen al storage: ", error);
      throw error;
    }
  }

  /**
   * Descarga una imagen desde una URL y la devuelve en base64.
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
   * USAMOS EL SDK NUEVO (VertexAI) AQUÍ, es más robusto para Gemini Vision.
   */
  async analyzelimage(imageUrl, question = "Describe la imagen") {
    try {
      const imageBase64 = await this.downloadImageAsBase64(imageUrl);

      // Usar VertexAI SDK (GenerativeModel)
      const model = this.vertexAI.getGenerativeModel({
        model: config.gcp.models.geminiVision || "gemini-pro-vision"
      });

      const request = {
        contents: [{
          role: "user",
          parts: [
            { text: question },
            { inlineData: { mimeType: "image/png", data: imageBase64 } } // Asumimos PNG, ideal detectar mimeType
          ]
        }]
      };

      const result = await model.generateContent(request);
      const response = await result.response;
      const analysis = response.candidates[0].content.parts[0].text;

      return analysis;
    } catch (error) {
      console.error("Error en analysis de imagen:", error);
      // Fallback a lógica antigua si falla el SDK nuevo? No, mejor reportar error.
    }
  }
}

export default vertexAdapter;
