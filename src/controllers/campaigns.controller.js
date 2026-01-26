import Brief from "../model/Brief.model.js";

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
  const { designerId } = req.body;

  const response = await Brief.select().where("designer_id", designerId).get();

  res.json({
    message: "Campañas obtenidas con éxito",
    data: response,
    success: true,
  });
};
