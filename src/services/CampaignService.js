/**
 * ------------------------------------------------------------------
 * Archivo: CampaignService.js
 * Ubicación: src/services/CampaignService.js
 * Responsabilidad: Lógica de negocio para campañas, incluyendo vectorización.
 * ------------------------------------------------------------------
 */

import VectorCore from "./VectorCore.js";
import CampaignVector from "../model/CampaignVector.model.js";

class CampaignService {
  /**
   * Genera y guarda un vector para una campaña basado en su brief_data.
   * @param {string} campaignId - ID de la campaña.
   * @param {Object} briefData - Objeto JSON con los datos del brief.
   */
  static async vectorizeCampaign(campaignId, briefData) {
    try {
      if (!briefData) {
        console.warn(
          `[CampaignService] No brief data for campaign ${campaignId}`,
        );
        return;
      }

      // 1. Concatenar campos relevantes para crear un contexto rico
      // Mapeo basado en el JSON de ejemplo provisto por el usuario
      const parts = [];
      if (briefData.nombre_campaing)
        parts.push(`Nombre: ${briefData.nombre_campaing}`);
      if (briefData.Objective) parts.push(`Objetivo: ${briefData.Objective}`);
      if (briefData.Description)
        parts.push(`Descripción: ${briefData.Description}`);
      if (briefData.observations)
        parts.push(`Observaciones: ${briefData.observations}`);
      if (briefData.ContentType)
        parts.push(`Tipo de Contenido: ${briefData.ContentType}`);

      const textToVectorize = parts.join("\n");

      if (!textToVectorize.trim()) {
        console.warn(`[CampaignService] Empty text for campaign ${campaignId}`);
        return;
      }

      console.log(`[CampaignService] Vectorizing campaign ${campaignId}...`);

      // 2. Generar embedding
      // Usamos embedText de VectorCore (asumiendo que usa text-embedding-004 o similar)
      const embedding = await VectorCore.embedText(textToVectorize);

      if (!embedding) {
        throw new Error("Failed to generate embedding");
      }

      // 3. Guardar en CampaignVector
      // Primero verificamos si ya existe para actualizarlo o crear uno nuevo
      // Nota: Dependiendo de Dynamo/Nicola, 'upsert' podría no existir, así que hacemos una búsqueda simple.
      const existing = await CampaignVector.where(
        "campaign_id",
        campaignId,
      ).get();

      if (existing.length > 0) {
        await CampaignVector.where("id", existing[0].id).update({
          embedding: embedding,
          text_content: textToVectorize,
        });
        console.log(
          `[CampaignService] Vector updated for campaign ${campaignId}`,
        );
      } else {
        await CampaignVector.create({
          campaign_id: campaignId,
          embedding: embedding,
          text_content: textToVectorize,
        });
        console.log(
          `[CampaignService] Vector created for campaign ${campaignId}`,
        );
      }
    } catch (error) {
      console.error(
        `[CampaignService] Error vectorizing campaign ${campaignId}:`,
        error,
      );
      // No lanzamos el error para no interrumpir el flujo principal del usuario,
      // pero lo logueamos correctamente.
    }
  }
}

export default CampaignService;
