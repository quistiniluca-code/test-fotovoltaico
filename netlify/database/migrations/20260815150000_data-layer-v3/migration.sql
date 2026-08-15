CREATE TABLE IF NOT EXISTS econ_fv_contacts (
  contact_id TEXT PRIMARY KEY,
  mobile_normalized TEXT NOT NULL UNIQUE,
  email_normalized TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS econ_fv_contacts_email_idx
  ON econ_fv_contacts (email_normalized)
  WHERE email_normalized IS NOT NULL;

ALTER TABLE econ_fv_leads
  ADD COLUMN IF NOT EXISTS contact_id TEXT REFERENCES econ_fv_contacts(contact_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS econ_fv_leads_contact_idx
  ON econ_fv_leads (contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS econ_fv_lead_requests (
  request_id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES econ_fv_leads(lead_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS econ_fv_lead_requests_lead_idx
  ON econ_fv_lead_requests (lead_id, created_at DESC);

ALTER TABLE econ_fv_events
  ADD COLUMN IF NOT EXISTS client_event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS econ_fv_events_client_event_id_uq
  ON econ_fv_events (client_event_id)
  WHERE client_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS econ_fv_documents (
  document_id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES econ_fv_leads(lead_id) ON DELETE CASCADE,
  attachment_type TEXT NOT NULL,
  blob_store TEXT NOT NULL,
  blob_key TEXT,
  original_filename TEXT,
  content_type TEXT,
  size_bytes BIGINT,
  sha256 TEXT NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  source TEXT NOT NULL DEFAULT 'lead_save',
  status TEXT NOT NULL DEFAULT 'received',
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_at TIMESTAMPTZ NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at TIMESTAMPTZ,
  retention_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '180 days'),
  deleted_at TIMESTAMPTZ,
  processing JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT econ_fv_documents_live_fields_chk CHECK (
    deleted_at IS NOT NULL OR (
      blob_key IS NOT NULL AND original_filename IS NOT NULL AND content_type IS NOT NULL AND size_bytes IS NOT NULL AND size_bytes > 0
    )
  ),
  UNIQUE (lead_id, attachment_type, sha256)
);

CREATE UNIQUE INDEX IF NOT EXISTS econ_fv_documents_current_uq
  ON econ_fv_documents (lead_id, attachment_type)
  WHERE is_current = TRUE AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS econ_fv_documents_blob_uq
  ON econ_fv_documents (blob_store, blob_key)
  WHERE blob_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS econ_fv_documents_retention_idx
  ON econ_fv_documents (retention_until)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS econ_fv_documents_lead_idx
  ON econ_fv_documents (lead_id, uploaded_at DESC);

INSERT INTO econ_fv_documents (
  document_id, lead_id, attachment_type, blob_store, blob_key,
  original_filename, content_type, size_bytes, sha256, source,
  status, is_current, uploaded_at, linked_at, retention_until, processing, metadata
)
SELECT
  'legacy-' || a.attachment_id,
  a.lead_id,
  a.attachment_type,
  a.blob_store,
  a.blob_key,
  a.original_filename,
  a.content_type,
  a.size_bytes,
  a.sha256,
  'legacy_attachment_backfill',
  'received',
  TRUE,
  a.uploaded_at,
  a.linked_at,
  a.uploaded_at + INTERVAL '180 days',
  COALESCE(a.processing, '{}'::jsonb),
  COALESCE(a.metadata, '{}'::jsonb)
FROM econ_fv_lead_attachments a
ON CONFLICT (lead_id, attachment_type, sha256) DO NOTHING;
