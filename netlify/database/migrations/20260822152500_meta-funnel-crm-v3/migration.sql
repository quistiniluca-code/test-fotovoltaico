CREATE TABLE IF NOT EXISTS econ_fv_engagements (
  engagement_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  lead_id TEXT,
  engagement_type TEXT NOT NULL,
  service_area_status TEXT NOT NULL DEFAULT 'UNKNOWN',
  service_area_region TEXT,
  service_area_province_code TEXT,
  attribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS econ_fv_engagements_session_idx
  ON econ_fv_engagements (session_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS econ_fv_engagements_lead_idx
  ON econ_fv_engagements (lead_id, occurred_at DESC)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS econ_fv_engagements_type_idx
  ON econ_fv_engagements (engagement_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS econ_fv_engagements_area_idx
  ON econ_fv_engagements (service_area_status, occurred_at DESC);
