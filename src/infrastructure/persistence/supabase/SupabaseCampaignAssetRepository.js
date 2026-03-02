import CampaignAssetRepositoryPort from "../../../application/ports/CampaignAssetRepositoryPort.js";
import supabase from "./supabaseClient.js";

class SupabaseCampaignAssetRepository extends CampaignAssetRepositoryPort {
  constructor(vectorizationService = null) {
    super();
    this.vectorizationService = vectorizationService;
  }

  async save(assetData) {
    const {
      img_url,
      thumbnail_url = null,
      prompt_used,
      campaign_id,
      status = 'draft',
      storage_location = 'temp',
      is_approved = false,
      is_saved = false,
      parent_asset_id = null
    } = assetData;

    const { data, error } = await supabase
      .from('campaign_assets')
      .insert([
        {
          img_url: { original: img_url, thumbnail: thumbnail_url },
          prompt_used,
          campaign_assets: campaign_id,
          status,
          storage_location,
          is_approved,
          is_saved,
          parent_asset_id
        }
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save campaign asset: ${error.message}`);
    }

    return data;
  }

  async findById(assetId) {
    const { data, error } = await supabase
      .from('campaign_assets')
      .select('*')
      .eq('id', assetId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to find asset: ${error.message}`);
    }
    return data;
  }

  async markAsApproved(assetId, updateData) {
    const { newUrl, newThumbnailUrl, storageLocation, approvedAt } = updateData;

    const { data, error } = await supabase
      .from('campaign_assets')
      .update({
        img_url: { original: newUrl, thumbnail: newThumbnailUrl },
        is_approved: true,
        status: 'approved',
        storage_location: storageLocation,
        approved_at: approvedAt
      })
      .eq('id', assetId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to approve asset: ${error.message}`);
    }

    // Vectorizar en background al aprobar
    if (data && data.prompt_used && this.vectorizationService) {
      this.vectorizationService.vectorizeAsset(data.id, data.prompt_used)
        .catch(err => console.error('[SupabaseCampaignAssetRepository] Error vectorizando asset aprobado:', err));
    }

    return data;
  }

  async delete(assetId) {
    const { error } = await supabase
      .from('campaign_assets')
      .delete()
      .eq('id', assetId);

    if (error) {
      throw new Error(`Failed to delete asset from DB: ${error.message}`);
    }
    return true;
  }

  async findByCampaignId(campaignId) {
    const { data, error } = await supabase
      .from('campaign_assets')
      .select('*')
      .eq('campaign_assets', campaignId);

    if (error) {
      throw new Error(`Failed to fetch assets for campaign: ${error.message}`);
    }
    return data;
  }

  async searchByVector(queryEmbedding, campaignId, limit = 20) {
    const { data, error } = await supabase
      .rpc('match_assets', {
        query_embedding: queryEmbedding,
        campaign_id_filter: campaignId,
        match_count: limit
      });

    if (error) {
      throw new Error(`Vector search failed: ${error.message}`);
    }
    return data || [];
  }
}

export default SupabaseCampaignAssetRepository;
