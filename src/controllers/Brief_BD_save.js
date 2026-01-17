import { supabase } from "../services/supaBaseClient.js";

export class brief_DB {
  static async Create_Campaing(req, res) {
    try {
      const { user_id } = req.body;

      const { error: Error } = await supabase
        .schema("public")
        .from("campaigns")
        .insert({
          user_id: user_id,
          status: "new",
          brief_data: {},
        });

      if (Error) {
        console.error("Error al crear la campaña", Error);
        res.statusCode = 500;
        return res.json({ error: "Error al crear la campaña." });
      }

      res.statusCode = 201;
      res.json({
        message: "Brief creado correctamente",
        campaigns: {
          id,
          created_at,
          user_id,
          status,
          brief_data,
        },
      });
    } catch (error) {
      console.error("Error crítico:", error);
      res.statusCode = 500;
      res.json({ error: "Error interno del servidor" });
    }
  }
  static async updateDataBrief(req, res) {
    console.log("inicio");
    const { data, error, status } = await supabase
    .from('campaigns')
    .update({brief_data: req.body.data})
    .eq('id', req.body.idCampaing)
    .select();

  if (error) {
    return res.status(400).json(error);
  }

  if (data.length === 0) {
    return res.status(404).json({ mensaje: "No se encontró el registro" });
  }

  return res.status(200).json(data); 

} catch (err) {
  console.error("Error de servidor:", err);
  return res.status(500).send("Error interno");

  }
}
