import { PredictionServiceClient, helpers } from "@google-cloud/aiplatform";
import { Storage } from "@google-cloud/storage";
import fs from "fs";
import path from "path";

// Mock config
const config = {
    gcp: {
        projectId: "ugb-creativamkt-484123",
        location: "us-central1",
        keyFilePath: path.resolve("config/key/creativa-key.json"), // adjust path relative to CWD
        models: {
            imagen2: "imagegeneration",
        },
        storage: {
            bucketName: "creativa-campaign-assets",
        },
    },
};

console.log("Key File Path:", config.gcp.keyFilePath);
if (!fs.existsSync(config.gcp.keyFilePath)) {
    console.error("Key file not found!");
    process.exit(1);
}

class vertexAdapter {
    constructor() {
        this.predictionClient = new PredictionServiceClient({
            apiEndpoint: `${config.gcp.location}-aiplatform.googleapis.com`,
            keyFilename: config.gcp.keyFilePath,
        });
        this.Storage = new Storage({
            projectId: config.gcp.projectId,
            keyFilename: config.gcp.keyFilePath,
        });
        this.bucket = this.Storage.bucket(config.gcp.storage.bucketName);
        this.projectId = config.gcp.projectId;
        this.location = config.gcp.location;
    }

    async imageGeneration(prompt, options = {}) {
        try {
            const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${config.gcp.models.imagen2}`;
            console.log("Endpoint:", endpoint);

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

            console.log("Sending prediction request...");
            const [response] = await this.predictionClient.predict(request);
            console.log("Response received.");

            if (!response.predictions || response.predictions.length === 0) {
                throw new Error("No fue posible generar la imagen");
            }
            return response.predictions;
        } catch (error) {
            console.error("Error en la generacion de imagenes: ", error);
            throw error;
        }
    }
}

async function run() {
    try {
        const adapter = new vertexAdapter();
        await adapter.imageGeneration("Test prompt");
    } catch (e) {
        console.error("Run failed:", e);
    }
}

run();
