import vertexAdapter from "../services/vertexAdapter.js";
import Regulator from "nicola-framework/dist/Regulator/index.js";
// Note: Regulator.load() is usually needed, but vertexAdapter imports config which calls it? 
// Actually config imports Regulator and calls .load(). So just importing vertexAdapter might be enough if config is imported execution-wise.
// However, creating a safe environment is better.

try {
    console.log("Starting reproduction test...");
    const vertex = new vertexAdapter();
    console.log("VertexAdapter instantiated. Calling imageGeneration...");

    const result = await vertex.imageGeneration("Un paisaje futurista cyberpunk", {
        aspectRatio: "16:9"
    });

    console.log("Result:", result);
} catch (error) {
    console.error("Caught error:", error);
}
