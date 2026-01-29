import Brief from "../model/Brief.model.js";
import CampaignAsset from "../model/CampaignAsset.model.js";

/**
 * Obtiene todas las campañas
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const getCampaigns = async (req, res) => {
  try {
    const data = await Brief.select().get();

    res.json({
      message: "Campañas obtenidas con éxito",
      data: data,
      success: true,
    });
  } catch (error) {
    res.statusCode = 500;
    res.json({
      message: "Error al obtener las campañas",
      error: error.message,
      success: false,
    });
  }
};

export const getCampaignsDesigners = async (req, res) => {
  const { designerId } = req.query;
  if (designerId === undefined) {
    return res.json({
      message: "No se proporciono un id de diseñador",
      success: false,
    });
  }
  console.log(designerId);
  try {
    const response = await Brief.select().where("designer_id", designerId).get();
    console.log(response);
    res.json({
      message: "Campañas obtenidas con éxito",
      data: response,
      success: true,
    });
  } catch (error) {
    res.statusCode = 500;
    res.json({
      message: "Error al obtener las campañas",
      error: error.message,
      success: false,
    });
  }
};



export const updateStateCampaign = async (req, res) => {
  const { campaignId, status } = req.body;

  if ((campaignId.length === 0 || status.length === 0) || campaignId === undefined || status === undefined) {
    res.statusCode = 400;
    return res.json({
      message: "No se proporciono un id de campaña o estado",
      success: false,
    });
  }

  try {
    const response = await Brief.where("id", campaignId).update({
      status: status
    });

    res.statusCode = 200;
    res.json({
      message: "Status actualizado con exito",
      success: true,
    });

  } catch (error) {
    res.statusCode = 500;
    res.json({
      message: "Error al actualizar el status",
      error: error.message,
      success: false,
    });
  }
}


export const getCampaingById = async (req, res) => {
  const { campaignId, designerId } = req.query;
  console.log(campaignId, designerId);
  if (campaignId === undefined || designerId === undefined) {
    res.statusCode = 400;
    return res.json({
      message: "No se proporciono un id de campaña o diseñador",
      success: false,
    });
  }

  try {

    const response = await Brief.select().where("id", campaignId).where("designer_id", designerId).get();

    if (response.length > 0) {
      const assets = await CampaignAsset.where("campaign_assets", campaignId).get();
      response[0].assets = assets.map((asset) => ({
        id: asset.id,
        img_url: asset.img_url,
        prompt_used: asset.prompt_used,
        is_approved: asset.is_approved,
        status: asset.status,
        created_at: asset.created_at,
        parent_asset_id: asset.parent_asset_id,
        is_refinement: asset.parent_asset_id ? true : false
      }));
    }

    res.statusCode = 200;
    res.json({
      message: "Ok",
      data: response,
      success: true
    })
  } catch (e) {
    res.statusCode = 500;
    res.json({
      message: "Error al obtener la campaña",
      error: e.message,
      success: false,
    })
  }
}