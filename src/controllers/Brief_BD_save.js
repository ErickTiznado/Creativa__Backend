/**
 * ------------------------------------------------------------------
 * Archivo: Brief_BD_save.js
 * Ubicación: src/controllers/Brief_BD_save.js
 * Responsabilidad: Crear/actualizar campañas (brief) en Supabase.
 *
 * Notas:
 * - Espera `{ data, idCampaing }` en el body.
 * - Este módulo asume una tabla `campaigns` en schema `public`.
 * - La persistencia depende de un cliente de Supabase exportado por el proyecto.
 * ------------------------------------------------------------------
 */

import { supabase } from "../services/supaBaseClient.js";

export class brief_DB {
  /**
   * Crea una campaña o intenta actualizar si `idCampaing` existe.
   */
  static async Registrar_Brief(req, res) {
    try {
      const { data, idCampaing } = req.body;
      const date = new Date();

      if (idCampaing != null) {
        const { error } = await supabase
          .schema("public")
          .from("campaigns")
          .select("id")
          .eq("id", idCampaing)
          .maybeSingle();

        if (error) {
          console.error("Error al consultar:", error);
        } else if (data) {
          this.updateDataBrief();
          return;
        }
      }

      const codigoUnico =
        date.getFullYear().toString() +
        String(date.getMonth() + 1).padStart(2, "0") +
        String(date.getDate()).padStart(2, "0") +
        String(date.getHours()).padStart(2, "0") +
        String(date.getMinutes()).padStart(2, "0") +
        String(date.getSeconds()).padStart(2, "0");

      const { error: Error } = await supabase
        .schema("public")
        .from("campaigns")
        .insert({
          id: codigoUnico,
          user_id: 100,
          status: "Activo",
          brief_data: data,
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

  /**
   * Actualiza `brief_data` para una campaña existente.
   */
  static async updateDataBrief(res, req) {
    const { data, id } = req.body;

    try {
      const { error: dbError } = await supabase
        .schema("public")
        .from("campaigns")
        .update({ brief_data: data })
        .eq("id", id);

      if (dbError) {
        console.error("Error al crear el brief", dbError);
        res.statusCode = 500;
        return res.json({ error: "Error al crear el brief." });
      }
    } catch (error) {}
  }
}
