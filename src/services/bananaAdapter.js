/**
 * ------------------------------------------------------------------
 * Archivo: bananaAdapter.js
 * Ubicación: src/services/bananaAdapter.js
 * Responsabilidad: Consumir Banana.dev para generar imágenes.
 * ------------------------------------------------------------------
 */

import * as banana from "@banana-dev/banana-dev";
import { Storage } from "@google-cloud/storage";
import config from "../../config/index.js";

class bananaAdapter {
    constructor() {
        this.apiKey = config.banana.apiKey;
        this.modelKey = config.banana.modelKey;

        // Reutilizamos la lógica de Storage de vertexAdapter
        this.Storage = new Storage({
            projectId: config.gcp.projectId,
            keyFilename: config.gcp.keyFilePath,
        });
        this.bucket = this.Storage.bucket(config.gcp.storage.bucketName);
    }

    /**
     * Genera una imagen usando Banana.dev.
     * @param {string} prompt - Descripción de la imagen.
     * @param {Object} options - Opciones (negativePrompt, etc.).
     */
    async imageGeneration(prompt, options = {}) {
        try {
            if (!this.apiKey || !this.modelKey) {
                throw new Error("Faltan las credenciales de Banana.dev en la configuración.");
            }

            const modelInputs = {
                prompt: prompt,
                negative_prompt: options.negativePrompt || "",
                num_inference_steps: options.steps || 20,
                guidance_scale: options.guidanceScale || 7,
                // Agrega más parámetros según lo que soporte tu modelo en Banana
            };

            console.log("Enviando petición a Banana.dev...", modelInputs);

            const out = await banana.run(this.apiKey, this.modelKey, modelInputs);

            console.log("Respuesta Banana:", JSON.stringify(out, null, 2));

            // La estructura de respuesta depende del modelo específico desplegado en Banana.
            // Comúnmente es out.modelOutputs[0].image_base64
            let imageBase64 = out?.modelOutputs?.[0]?.image_base64;

            // Intentar fallbacks comunes si la estructura es diferente
            if (!imageBase64 && out?.modelOutputs?.[0]?.image) {
                imageBase64 = out.modelOutputs[0].image;
            }

            if (!imageBase64) {
                throw new Error("No se encontró la imagen en la respuesta de Banana.");
            }

            // Subir a Cloud Storage
            const filename = `banana_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
            const imageURL = await this.uploadImageToStorage(
                imageBase64,
                filename,
                options.folder || "banana_campaigns"
            );

            return {
                url: imageURL,
                filename: filename,
                prompt: prompt,
                generatedAT: new Date().toISOString(),
                provider: "banana-dev",
            };

        } catch (error) {
            console.error("Error en BananaAdapter:", error);
            throw error;
        }
    }

    /**
     * Sube una imagen en base64 a Cloud Storage.
     * (Copiado de vertexAdapter para mantener consistencia)
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
                        source: "banana-dev",
                    },
                },
                public: true,
            });

            const publicUrl = `${config.gcp.storage.publicUrl}/${filePath}`;
            return publicUrl;
        } catch (error) {
            console.error("Error al subir la imagen al storage:", error);
            throw error;
        }
    }
}

export default bananaAdapter;
