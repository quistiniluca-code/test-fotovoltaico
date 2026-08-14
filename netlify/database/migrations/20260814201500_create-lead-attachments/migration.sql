CREATE TABLE IF NOT EXISTS econ_fv_lead_attachments (
  attachment_id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES econ_fv_leads(lead_id) ON DELETE CASCADE,
  attachment_type TEXT NOT NULL,
  blob_store TEXT NOT NULL,
  blob_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  sha256 TEXT NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  uploaded_at TIMESTAMPTZ NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (lead_id, attachment_type),
  UNIQUE (blob_store, blob_key)
);

CREATE INDEX IF NOT EXISTS econ_fv_lead_attachments_lead_idx
  ON econ_fv_lead_attachments (lead_id, attachment_type);
CREATE INDEX IF NOT EXISTS econ_fv_lead_attachments_sha_idx
  ON econ_fv_lead_attachments (sha256);
