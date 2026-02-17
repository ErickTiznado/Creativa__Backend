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
export const getAll = async (req, res) => {
  try {
    let query = Assets.select("id , img_url, created_at");

    const response = await query.get();

    if (response.length === 0) {
      res.statusCode = 404;
      res.json({ message: "No se han encontrado imagenes" });
    }

    res.statusCode = 200;
    res.json({
      success: true,
      data: response,
    });
  } catch (err) {
    console.error("Error al obtener datos de asset: " + err.message);
    res.statusCode = 500;
    res.json({ message: "No ha sido posible obtener las imagenes" });
  }
};

export const checkAssets = async (req, res) => {
  //Se obtiene la campaña para verificar que el asset pertenesca a ella
  try {
    const campaignId = req.params.campaignId;
    if (!campaignId) {
      res.statusCode = 400;
      return res.json({ message: "ID es requerido", success: false });
    }

    let query = Assets.select("id").where("parent_asset_id", campaignId);

    const response = await query.get();
    console.log(response);

    if (response.length === 0) {
      res.statusCode = 404;
      return res.json({
        success: true,
        exists: false,
      });
    }

    res.statusCode = 201;
    res.json({
      success: true,
      exists: true,
    });
  } catch (err) {
    console.error("Error al validar imagen de asset: " + err.message);
    res.statusCode = 500;
    res.json({ message: "Error en validacion de assets" });
  }
};

export const save = async (req, res) => {
  try {
    let { campaign_id, asset_urls } = req.body;

    if (!campaign_id) {
      res.statusCode = 400;
      res.json({ message: "Se requiere el ID de la campaña" });
    }
    if (!asset_urls) {
      res.statusCode = 400;
      res.json({ message: "Se requieren los assets ha guardar" });
    }

    let query = await Assets.create({
      parent_asset_id: campaign_id,
      img_url: {url: asset_urls},
    });

    if (!query) {
      res.statusCode = 500;
      res.json({ message: "No fue posible guardar las imagenes" });
      return;
    }

    res.statusCode = 201;
    res.json({
      success: true,
    });
  } catch (err) {
    res.statusCode = 500;
    res.json({ message: "Error al guardar imagen", errror: err.message });
    console.error("Error al guardar los activos: " + err.message);
  }
};



export const updateAssets = async (req, res) => {
  try {
    let { campaign_id, asset_urls } = req.body;

    if (!campaign_id) {
      res.statusCode = 400;
      res.json({ message: "Se requiere el ID de la campaña" });
    }
    if (!asset_urls) {
      res.statusCode = 400;
      res.json({ message: "Se requieren los assets ha guardar" });
    }

    const query = await Assets.where("id", campaign_id).update({
      url_img: {url:asset_urls},
    });

    if (!query) {
      res.statusCode = 500;
      res.json({ message: "No fue posible actualizar las imagenes" });
      return;
    }

    res.statusCode = 201;
    res.json({
      success: true,
    });
  } catch (err) {
    res.statusCode = 500;
    res.json({ message: "No fue posible actualizar las imagenes" });
    return;
  }
};

