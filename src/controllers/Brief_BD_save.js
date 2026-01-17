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
      });
    } catch (error) {
      console.error("Error crítico:", error);
      res.statusCode = 500;
      res.json({ error: "Error interno del servidor" });
    }
  }



  static async updateDataBrief(req, res) {
    try {
    const { data, error } = await supabase
    .from('campaigns')
    .update({brief_data: req.body.data })
    .eq('id', req.body.idCampaing);

  if (error) {
    console.error("Error de Supabase:", error);
    return 
  }
  res.statusCode = 200;
  return res.json({ message : "Modificación de datos de campaña exitosa." });
} catch (err) {
  console.error("Error de servidor:", err);
  return res.status(500).send("Error interno");
}
  }
}
