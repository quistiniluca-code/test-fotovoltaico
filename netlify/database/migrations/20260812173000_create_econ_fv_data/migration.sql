CREATE TABLE IF NOT EXISTS econ_fv_leads (
  lead_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT NOT NULL,
  commercial_fv_request BOOLEAN NOT NULL DEFAULT FALSE,
  property_address TEXT NOT NULL,
  score INTEGER,
  profile_band TEXT,
  surprise TEXT,
  supplier TEXT,
  annual_kwh NUMERIC(12,2),
  annual_spend NUMERIC(12,2),
  privacy_version TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'econ-fv-test',
  attribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  bill_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS econ_fv_leads_created_at_idx ON econ_fv_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS econ_fv_leads_commercial_idx ON econ_fv_leads (commercial_fv_request, created_at DESC);
CREATE INDEX IF NOT EXISTS econ_fv_leads_score_idx ON econ_fv_leads (score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS econ_fv_leads_surprise_idx ON econ_fv_leads (surprise);
CREATE INDEX IF NOT EXISTS econ_fv_leads_supplier_idx ON econ_fv_leads (supplier);

CREATE TABLE IF NOT EXISTS econ_fv_events (
  event_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  event TEXT NOT NULL,
  step INTEGER,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS econ_fv_events_session_idx ON econ_fv_events (session_id, occurred_at);
CREATE INDEX IF NOT EXISTS econ_fv_events_event_idx ON econ_fv_events (event, occurred_at DESC);
CREATE INDEX IF NOT EXISTS econ_fv_events_occurred_at_idx ON econ_fv_events (occurred_at DESC);
