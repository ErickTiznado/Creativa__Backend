import ContextRetrieverPort from "../../../application/ports/ContextRetrieverPort.js";
import supabase from "./supabaseClient.js";

class SupabaseContextRetriever extends ContextRetrieverPort {
  /**
   * Retrieves brand and campaign vectors to enrich the image prompt.
   * @param {string} brandId
   * @param {string} campaignId
   * @returns {Promise<Object>} An object containing text chunks from brand manuals and campaign data.
   */
  async getContext(brandId, campaignId) {
    const context = {
      data: []
    };

    // 1. Fetch Brand Manual Content
    // Assuming metadata->>'brandId' links to the brand. Adjust if schema differs.
    // If brandId is not provided, we can't fetch brand context.
    if (brandId) {
      const { data: brandData, error: brandError } = await supabase
        .from('brand_manual_vectors')
        .select('content_text, metadata')
        .contains('metadata', { brandId: brandId });

      if (brandError) {
        console.warn(`Error al obtener el contexto de marca para la marca ${brandId}:`, brandError.message);
      } else if (brandData && brandData.length > 0) {
        context.data.push(...brandData);
      }
    }

    // 2. Fetch Campaign Context (Previous successful vectors, or specific campaign brief vectors)
    if (campaignId) {
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaign_vectors')
        .select('text_content') // Assuming 'text_content' holds relevant text based on schema check
        .eq('campaign_id', campaignId);

      if (campaignError) {
        console.warn(`Error al obtener el contexto de campaña para la campaña ${campaignId}:`, campaignError.message);
      } else if (campaignData && campaignData.length > 0) {
         // Map to structure expected by BrandSanitizer (content_text)
         const mappedCampaignData = campaignData.map(d => ({ content_text: d.text_content }));
         context.data.push(...mappedCampaignData);
      }
    }
    
    // Return empty context if no data found, preventing crashes in BrandSanitizer
    return context.data.length > 0 ? context : null;
  }
}

export default SupabaseContextRetriever;
