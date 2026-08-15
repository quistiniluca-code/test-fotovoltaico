ALTER TABLE econ_fv_lead_attachments
  ADD COLUMN IF NOT EXISTS parse_status TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS parser_mode TEXT,
  ADD COLUMN IF NOT EXISTS parser_version TEXT,
  ADD COLUMN IF NOT EXISTS engine TEXT,
  ADD COLUMN IF NOT EXISTS engine_version TEXT,
  ADD COLUMN IF NOT EXISTS data_mode TEXT,
  ADD COLUMN IF NOT EXISTS data_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parse_error_code TEXT,
  ADD COLUMN IF NOT EXISTS processing JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS econ_fv_lead_attachments_processing_idx
  ON econ_fv_lead_attachments (parse_status, data_mode);
