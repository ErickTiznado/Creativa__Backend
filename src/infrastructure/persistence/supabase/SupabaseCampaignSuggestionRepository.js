import CampaignSuggestionRepositoryPort from '../../../application/ports/CampaignSuggestionRepositoryPort.js';
import supabase from './supabaseClient.js';

class SupabaseCampaignSuggestionRepository extends CampaignSuggestionRepositoryPort {
    async save(suggestion) {
        const payload = {
            campaign_id:       suggestion.campaign_id,
            prompts:           suggestion.prompts,
            recommended_style: suggestion.recommended_style ?? null,
            reasoning:         suggestion.reasoning ?? null,
            settings:          suggestion.settings ?? {},
        };

        const { data, error } = await supabase
            .from('campaign_suggestions')
            .insert([payload])
            .select()
            .single();

        if (error) {
            throw new Error(`Error guardando sugerencia: ${error.message}`);
        }

        return data;
    }

    async findByCampaignId(campaignId) {
        const { data, error } = await supabase
            .from('campaign_suggestions')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Error buscando sugerencias: ${error.message}`);
        }

        return data || [];
    }
}

export default SupabaseCampaignSuggestionRepository;
