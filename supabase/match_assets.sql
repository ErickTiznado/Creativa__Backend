-- Función RPC para búsqueda vectorial semántica de assets
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Requiere la extensión pgvector habilitada en el proyecto Supabase.
-- La dimensión 768 corresponde al modelo text-embedding-004 de Google Vertex AI.

CREATE OR REPLACE FUNCTION devschema.match_assets(
  query_embedding vector(768),
  campaign_id_filter uuid,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  img_url json,
  prompt_used text,
  is_approved boolean,
  campaign_assets uuid,
  parent_asset_id uuid,
  status varchar,
  storage_location varchar,
  is_saved boolean,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ca.id,
    ca.created_at,
    ca.img_url,
    ca.prompt_used,
    ca.is_approved,
    ca.campaign_assets,
    ca.parent_asset_id,
    ca.status,
    ca.storage_location,
    ca.is_saved,
    (1 - (cav.embedding <=> query_embedding))::float AS similarity
  FROM devschema.campaign_asset_vectors cav
  JOIN devschema.campaign_assets ca ON ca.id = cav.asset_id
  WHERE ca.campaign_assets = campaign_id_filter
    AND (1 - (cav.embedding <=> query_embedding)) > match_threshold
  ORDER BY cav.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
