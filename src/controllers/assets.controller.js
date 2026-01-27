import Assets from "../model/assets.model.js";

export const getAssets = async (req, res) => {
    try {
        const response = await Assets.select().get();
        res.statusCode = 200;
        res.json({
            message: "Ok",
            data: response,
            success: true
        })
    } catch (e) {
        res.statusCode = 500;
        res.json({
            message: "Error al obtener los assets",
            error: e.message,
            success: false
        })
    }
}