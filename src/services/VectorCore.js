import { VertexAI } from "@google-cloud/vertexai";

import config from "../config";

const vertexAI = new VertexAI({
  projectId: config.gcp.projectId,
  location: config.gcp.location,
  keyFile: config.gcp.keyFilePath,
});


class VectorCore{


    static async embed(text){
        const model = vertexAI.getGenerativeModel({
            model: config.gcp.models.embedingModel
        });

        const result = await model.embedContent(text);

        return result.embedding.values;
    }
}

export default VectorCore;