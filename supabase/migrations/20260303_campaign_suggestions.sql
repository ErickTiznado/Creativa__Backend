-- Migration: campaign_suggestions
-- Stores every AI suggestion generation for a campaign, including the
-- generator settings that were active at the time.

CREATE TABLE IF NOT EXISTS devschema_test.campaign_suggestions (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id       UUID        NOT NULL,
    prompts           JSONB       NOT NULL DEFAULT '[]',
    recommended_style TEXT,
    reasoning         TEXT,
    settings          JSONB       NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_suggestions_campaign_id
    ON devschema_test.campaign_suggestions (campaign_id, created_at DESC);
