import Assets from "../model/assets.model.js";
import ImageStorageService from "../services/ImageStorageService.js";

export const getAssets = async (req, res) => {
  try {
    const { is_saved, campaign_id } = req.query;

    let query = Assets.select();

    // Filter by is_saved if provided
    if (is_saved !== undefined) {
      const isSavedBool = is_saved === "true" || is_saved === true;
      query = query.where("is_saved", isSavedBool);
    }

    // Filter by campaign if provided
    if (campaign_id) {
      query = query.where("campaign_assets", campaign_id);
    }

    const response = await query.get();
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

export const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_saved } = req.body;

    if (!id) {
      res.statusCode = 400;
      return res.json({ message: "ID es requerido", success: false });
    }

    if (is_saved === undefined) {
      res.statusCode = 400;
      return res.json({ message: "is_saved es requerido", success: false });
    }

    // Solo actualiza el campo is_saved, sin ejecutar flujo de aprobación
    const updated = await Assets.where("id", id).update({ is_saved });

    if (!updated || updated.length === 0) {
      res.statusCode = 404;
      return res.json({ message: "Asset no encontrado", success: false });
    }

    res.statusCode = 200;
    res.json({
      message: "Asset actualizado exitosamente",
      data: updated[0],
      success: true,
    });
  } catch (e) {
    console.error("Error updateAsset:", e);
    res.statusCode = 500;
    res.json({
      message: "Error al actualizar asset",
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
