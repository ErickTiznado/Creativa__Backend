/**
 * ------------------------------------------------------------------
 * Archivo: Brief_BD_save.js
 * Ubicación: src/controllers/Brief_BD_save.js
 * Responsabilidad: Controlador para operaciones CRUD de campañas (brief) en Supabase.
 *
 * Métodos disponibles:
 * - Create_Campaing: Crea una nueva campaña vacía para un usuario.
 * - Registrar_Brief: Crea o actualiza un brief según si existe `idCampaing`.
 * - updateDataBrief: Actualiza solo el campo `brief_data` de una campaña existente.
 *
 * Notas:
 * - Usa la tabla `campaigns` en schema `public` de Supabase.
 * - Los datos del brief se almacenan como JSONB en `brief_data`.
 * ------------------------------------------------------------------
 */

import { supabase } from "../services/SupabaseClient.js";
import { randomUUID } from "crypto";

export class brief_DB {
  /**
   * Crea una nueva campaña para un usuario.
   *
   * @route POST /ai/createCampaing
   * @param {Object} req.body - { user_id: string }
   * @returns {Object} - { message: "Brief creado correctamente" }
   *
   * Descripción:
   * Inserta una nueva fila en `campaigns` con estado "new" y brief_data vacío.
   * Esta campaña luego puede ser actualizada con datos del brief mediante updateDataBrief.
   */
  static async Create_Campaing(req, res) {
    try {
      const { user_id } = req.body;

      // Validación de entrada
      if (!user_id) {
        res.statusCode = 400;
        return res.json({ error: "El campo user_id es obligatorio." });
      }

      const { error: Error } = await supabase
        .schema("devschema")
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

  /**
   * Crea un brief completo o lo actualiza si ya existe.
   *
   * @route POST /ai/registerBrief
   * @param {Object} req.body - { data: Object, idCampaing?: string }
   * @returns {Object} - { message: "Brief creado/actualizado correctamente" }
   *
   * Descripción:
   * Si `idCampaing` existe, verifica la campaña y delega a updateDataBrief.
   * Si no existe, crea una nueva campaña con código único como ID.
   */
  static async Registrar_Brief(req, res) {
    try {
      const { user_id, data, idCampaing, designer_id } = req.body;

      // Si se proporciona ID de campaña existente, actualizar
      if (idCampaing != null) {
        const { data: existingCampaign, error } = await supabase
          .schema("devschema")
          .from("campaigns")
          .select("id")
          .eq("id", idCampaing)
          .maybeSingle();

        if (error) {
          console.error("Error al consultar campaña:", error);
          res.statusCode = 500;
          return res.json({ error: "Error al verificar campaña existente." });
        }

        if (existingCampaign) {
          // Delegar a updateDataBrief
          return await this.updateDataBrief(req, res);
        }
      }

      // Crear nueva campaña con UUID
      const campaignId = randomUUID();

      const { error: insertError } = await supabase
        .schema("devschema")
        .from("campaigns")
        .insert({
          id: campaignId,
          user_id: user_id,
          brief_data: data,
          status: "draft",
          designer_id: designer_id,
        });

      if (insertError) {
        console.error("Error al insertar brief:", insertError);
        res.statusCode = 500;
        return res.json({ error: "Error al crear el brief." });
      }

      res.statusCode = 201;
      res.json({
        message: "Brief creado correctamente",
        id: campaignId,
      });
    } catch (error) {
      console.error("Error crítico en Registrar_Brief:", error);
      res.statusCode = 500;
      res.json({ error: "Error interno del servidor" });
    }
  }

  /**
   * Actualiza únicamente el campo `brief_data` de una campaña existente.
   *
   * @route PUT/PATCH /ai/updateCampaing
   * @param {Object} req.body - { data: Object, idCampaing: string }
   * @returns {Object} - { message: "Modificación de datos de campaña exitosa." }
   *
   * Descripción:
   * Busca la campaña por ID y actualiza solo su campo `brief_data` con el nuevo contenido.
   * Útil para guardar progreso del chat mientras se recopila información del brief.
   */
  static async updateDataBrief(req, res) {
    try {
      const { data, idCampaing } = req.body;

      // Validación de entrada
      if (!idCampaing) {
        res.statusCode = 400;
        return res.json({ error: "El campo idCampaing es obligatorio." });
      }

      if (!data) {
        res.statusCode = 400;
        return res.json({ error: "El campo data es obligatorio." });
      }

      const { error } = await supabase
        .schema("devschema")
        .from("campaigns")
        .update({ brief_data: data })
        .eq("id", idCampaing);

      if (error) {
        console.error("Error de Supabase al actualizar:", error);
        res.statusCode = 500;
        return res.json({ error: "Error al actualizar el brief." });
      }

      res.statusCode = 200;
      return res.json({ message: "Modificación de datos de campaña exitosa." });
    } catch (err) {
      console.error("Error de servidor en updateDataBrief:", err);
      res.statusCode = 500;
      return res.json({ error: "Error interno del servidor" });
    }
  }
}
