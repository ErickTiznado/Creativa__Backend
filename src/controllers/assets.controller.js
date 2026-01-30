import Assets from "../model/assets.model.js";
import ImageStorageService from "../services/ImageStorageService.js";

export const getAssets = async (req, res) => {
  try {
    const response = await Assets.select().get();
    res.statusCode = 200;
    res.json({
      message: "Ok",
      data: response,
      success: true,
    });
  } catch (e) {
    res.statusCode = 500;
    res.json({
      message: "Error al obtener los assets",
      error: e.message,
      success: false,
    });
  }
};

export const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.statusCode = 400;
      return res.json({ message: "ID es requerido", success: false });
    }

    const result = await ImageStorageService.deleteAssetRecursive(id);

    res.statusCode = 200;
    res.json({
      message: "Proceso de eliminación finalizado",
      data: result,
      success: true,
    });
  } catch (e) {
    console.error("Error deleteAsset:", e);
    res.statusCode = 500;
    res.json({
      message: "Error al eliminar asset",
      error: e.message,
      success: false,
    });
  }
};
