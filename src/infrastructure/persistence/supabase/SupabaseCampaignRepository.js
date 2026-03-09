import CampaignRepositoryPort from '../../../application/ports/CampaignRepositoryPort.js';
import supabase from './supabaseClient.js';

class SupabaseCampaignRepository extends CampaignRepositoryPort {
    async save(campaignData) {
        const insertPayload = {
            id: campaignData.id,
            user_id: campaignData.user_id,
            designer_id: campaignData.designer_id,
            status: campaignData.status,
            brief_data: campaignData.brief_data,
            company: campaignData.company
        };

        const { data, error } = await supabase
            .schema('devschema_test')
            .from('campaigns')
            .insert([insertPayload])
            .select()
            .single();

        if (error) {
            throw new Error(`Error insertando campaña en Supabase: ${error.message}`);
        }

        return data;
    }

    async updateStatus(campaignId, status) {
        const { error } = await supabase
            .schema('devschema_test')
            .from('campaigns')
            .update({ status: status })
            .eq('id', campaignId);

        if (error) {
            throw new Error(`Error actualizando estado en Supabase: ${error.message}`); throw new Error(`Error actualizando estado de campaña en Supabase: ${error.message}`);
        }
        return true;
    }

    async updateBrief(campaignId, briefData) {
        const { error } = await supabase
            .schema('devschema_test')
            .from('campaigns')
            .update({ brief_data: briefData })
            .eq('id', campaignId);

        if (error) {
            throw new Error(`Error actualizando brief en Supabase: ${error.message}`);
        }
        return true;
    }

    async findById(campaignId) {
        const { data, error } = await supabase
            .schema('devschema_test')
            .from('campaigns')
            .select()
            .eq('id', campaignId)
            .single();

        if (error) {

            if (error.code === 'PGRST116') return null;
            throw new Error(`Error buscando campaña en Supabase: ${error.message}`);
        }
        return data;
    }

    async findByDesignerId(designerId) {
        const { data, error } = await supabase
            .schema('devschema_test')
            .from('campaigns')
            .select('*')
            .eq('designer_id', designerId);

        if (error) {
            throw new Error(`Error buscando campañas por diseñador: ${error.message}`);
        }

        return data || [];
    }

    async findByIdAndDesignerId(campaignId, designerId) {
        // 1. Empezamos la consulta solo con el ID de la campaña
        let query = supabase
            .schema('devschema_test')
            .from('campaigns')
            .select('*')
            .eq('id', campaignId);

        // 2. SOLO filtramos por diseñador si el frontend nos envió el parámetro
        if (designerId) {
            query = query.eq('designer_id', designerId);
        }

        const { data: campaign, error: campaignError } = await query.single();

        if (campaignError) {
            if (campaignError.code === 'PGRST116') return null;
            throw new Error(`Error buscando campaña en Supabase: ${campaignError.message}`);
        }

        const { data: assets, error: assetsError } = await supabase
            .schema('devschema_test')
            .from('campaign_assets')
            .select('*')
            .eq('campaign_id', campaignId); // BUG CORREGIDO AQUÍ: Era 'campaign_id', no 'campaign_assets'

        if (assetsError) {
            console.error("[Repository] Error buscando assets:", assetsError);
            campaign.assets = [];
        } else {
            campaign.assets = assets.map(asset => {
                const rawUrl = asset.img_url;
                let imgUrl = rawUrl;
                let thumbUrl = null;

                if (typeof rawUrl !== 'string' && rawUrl) {
                    imgUrl = rawUrl.original || null;
                    thumbUrl = rawUrl.thumbnail || null;
                }

                return {
                    id: asset.id,
                    img_url: imgUrl,
                    thumbnail_url: thumbUrl,
                    prompt_used: asset.prompt_used,
                    is_approved: asset.is_approved,
                    status: asset.status,
                    created_at: asset.created_at,
                    parent_asset_id: asset.parent_asset_id,
                    is_refinement: asset.parent_asset_id ? true : false,
                };
            });
        }

        return campaign;
    }

    async findAll() {
        const { data, error } = await supabase
            .schema('devschema_test')
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error('ERR_METHOD_NOT_IMPLEMENTED');
        }

        return data || [];
    }
}


export default SupabaseCampaignRepository;