import supabase from "../../persistence/supabase/supabaseClient.js";
import GcpStorageAdapter from "../../external-services/storage/GcpStorageAdapter.js";
import multer from "multer";
// Ya se encontraba dentro de un model aparte
class Assets {
  static tableName = "devschema.campaign_assets";
}
// ya se encontraban en el controlador =>
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

    res.status(200).json({
      message: "Ok",
      data: response,
      success: true,
    });
  } catch (e) {
    res.status(500).json({
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
      return res
        .status(400)
        .json({ message: "ID es requerido", success: false });
    }

    if (is_saved === undefined) {
      return res
        .status(400)
        .json({ message: "is_saved es requerido", success: false });
    }

    // Solo actualiza el campo is_saved, sin ejecutar flujo de aprobación
    const updated = await Assets.where("id", id).update({ is_saved });

    if (!updated || updated.length === 0) {
      res.status(404).json({ message: "Asset no encontrado", success: false });
    }

    res.status(200).json({
      message: "Asset actualizado exitosamente",
      data: updated[0],
      success: true,
    });
  } catch (e) {
    console.error("Error updateAsset:", e);
    res.status(50).json({
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
      return res
        .status(400)
        .json({ message: "ID es requerido", success: false });
    }

    const result = await ImageStorageService.deleteAssetRecursive(id);

    res.status(200).json({
      message: "Proceso de eliminación finalizado",
      data: result,
      success: true,
    });
  } catch (e) {
    console.error("Error deleteAsset:", e);
    res.status(500).json({
      message: "Error al eliminar asset",
      error: e.message,
      success: false,
    });
  }
};

// => comienzo de la parte de controlador de assets conforme a  Gestión de Activos y Repositorio (Part 2: Asset Management & Repository)
export const getAll = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("campaign_assets")
      .select("id , img_url, created_at");

    if (data.length === 0) {
      res.status(404).json({ message: "No se han encontrado imagenes" });
    }

    return res.status(200).json({
      success: true,
      data: data,
    });
  } catch (err) {
    console.error("Error al obtener datos de asset: " + err.message);
    res
      .status(500)
      .json({ message: "No ha sido posible obtener las imagenes" });
  }
};

export const checkAssets = async (req, res) => {
  //Se obtiene la campaña para verificar que el asset pertenesca a ella
  try {
    const campaignId = req.params.campaignId;
    if (!campaignId) {
      res.status(400).json({ message: "ID es requerido", success: false });
    }


    const { data, error } = await supabase
      .from("campaign_assets")
      .select("id")
      .eq("parent_asset_id", campaignId)
      .select();

    if (data.length === 0) {
      return res.status(404).json({
        success: true,
        exists: false,
      });
    }

    res.status(201).json({
      success: true,
      exists: true,
    });
  } catch (err) {
    console.error("Error al validar imagen de asset: " + err.message);
    res.status(500).json({ message: "Error en validacion de assets" });
  }
};

export const save = async (req, res) => {
  try {
    let { campaign_id, asset_urls } = req.body;

    if (!campaign_id) {
      res.status(400).json({ message: "Se requiere el ID de la campaña" });
    }
    if (!asset_urls) {
      res.status(400).json({ message: "Se requieren los assets ha guardar" });
    }

    const { data, error } = await supabase
      .from("campaign_assets")
      .insert([{ parent_asset_id: campaign_id, img_url: asset_urls }])
      .select();

    if (data.length === 0) {
      res
        .status(400)
        .json({ message: "No fue posible guardar las imagenes: " + error });
      return;
    }

    res.status(201).json({
      success: true,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al guardar imagen", error: err.message });
    console.error("Error al guardar los activos: " + err.message);
  }
};

export const updateAssets = async (req, res) => {
  try {
    let { campaign_id, asset_urls } = req.body;

    if (!campaign_id) {
      res.status(400).json({ message: "Se requiere el ID de la campaña" });
      return;
    }
    if (!asset_urls) {
      res.status(400).json({ message: "Se requieren los assets ha guardar" });
      return;
    }

    const { data, error } = await supabase
      .from("campaign_assets")
      .update({ Url_img: asset_urls })
      .eq("id", campaign_id)
      .select();

    if (data.length === 0) {
      res
        .status(400)
        .json({ message: "No fue posible actualizar las imagenes" + error });
      return;
    }

    res.status(201).json({
      success: true,
    });
  } catch (err) {
    res.status(500).json({ message: "No fue posible actualizar las imagenes" });
    return;
  }
};

export const deleteAssets = async (req, res) => {
  try {
    const assetid = req.params.assetid;
    if(!assetid){
      res.status(400).json({ message: "ID es requerido", success: false });
      return
    }
    const { data, error } = await supabase
      .from("campaign_assets")
      .delete()
      .eq("id", assetid)
      .select();

    if (data === 0) {
      res
        .status(400)
        .json({ message: "No ha sido posible eliminar el activo" + error });
      return;
    }
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


