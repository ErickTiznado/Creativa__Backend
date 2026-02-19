import CampaignAssetRepositoryPort from "../../../application/ports/CampaignAssetRepositoryPort.js";
import supabase from "./supabaseClient.js";

class SupabaseCampaignAssetRepository extends CampaignAssetRepositoryPort {
  async save(assetData) {
    const {
      img_url,
      prompt_used,
      campaign_id, // maps to campaign_assets column
      status = 'draft',
      storage_location = 'temp',
      is_approved = false,
      is_saved = true,
      parent_asset_id = null
    } = assetData;

    const { data, error } = await supabase
      .from('campaign_assets') // table name
      .insert([
        {
          img_url: { asset_urls: Array.isArray(img_url) ? img_url : [img_url] },
          prompt_used,
          campaign_assets: campaign_id, // FK column name (matches schema)
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
      // If no rows found, data is null, error is 'PGRST116' (JSON object is null)
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to find asset: ${error.message}`);
    }
    return data;
  }

  async markAsApproved(assetId, updateData) {
    const { newUrl, storageLocation, approvedAt } = updateData;
    
    // We update the URL to the permanent one, set approved flag, status, location
    const { data, error } = await supabase
      .from('campaign_assets')
      .update({
        img_url: { asset_urls: [newUrl] }, // Update URL to permanent location
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
      .eq('campaign_assets', campaignId); // campaign_assets is the FK column name

    if (error) {
      throw new Error(`Failed to fetch assets for campaign: ${error.message}`);
    }
    return data;
  }
}

export default SupabaseCampaignAssetRepository;
