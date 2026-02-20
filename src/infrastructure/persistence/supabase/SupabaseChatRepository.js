import supabase from './supabaseClient.js';

class SupabaseChatRepository {
    async getByCampaignId(campaignId) {
        // Escudo protector: Si llega vacío o dice "undefined" literal, explotamos aquí mismo.
        if (!campaignId || campaignId === 'undefined') {
            throw new Error(`[Repositorio] 🚨 Se intentó buscar con un ID inválido: ${campaignId}`);
        }

        try {
            const { data, error } = await supabase
                .schema('devschema')
                .from('campaings_chat_sessions')
                .select('*')
                .eq('campings_id', campaignId);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error("[SupabaseChatRepository] Error obteniendo chat por campaña:", error);
            throw error;
        }
    }

    async getById(sessionId) {
        if (!sessionId || sessionId === 'undefined') throw new Error("ID de sesión inválido");

        const { data, error } = await supabase
            .schema('devschema')
            .from('campaings_chat_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async upsertSession(sessionData) {
        const { data, error } = await supabase
            .schema('devschema')
            .from('campaings_chat_sessions')
            .upsert([sessionData], { onConflict: 'id' });

        if (error) throw error;
        return data;
    }
}

export default SupabaseChatRepository;