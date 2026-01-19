import BrandManualVectorsModel from "../model/brand_manual_vectors.model.js"


const brand_manual_vectors = async (vector, match_threshold, match_count) => {
    const data = await BrandManualVectorsModel
        .where(`embedding <=> '${vector}' `, '<', 1 - match_threshold)
        .orderBy(`embedding <=> '${vector}'`)
        .limit(match_count)
        .get()


    return data
}

export {
    brand_manual_vectors
}
