import { getDatabase } from "@netlify/database";
import { dataStore } from "./_shared/blob-store.js";

const BATCH_SIZE = 250;

export default async () => {
  const db = getDatabase();
  const expired = await db.sql`
    SELECT document_id, lead_id, attachment_type, blob_store, blob_key, is_current
    FROM econ_fv_documents
    WHERE deleted_at IS NULL
      AND retention_until < NOW()
    ORDER BY retention_until ASC
    LIMIT ${BATCH_SIZE}
  `;

  let deleted = 0;
  let failed = 0;

  for (const document of expired) {
    const store = dataStore(document.blob_store, { consistency: "strong" });
    try {
      if (document.blob_key) await store.delete(document.blob_key);

      if (document.is_current) {
        const manifestKey = `lead/${document.lead_id}/bill/manifest`;
        const manifest = await store.get(manifestKey, { type: "json" }).catch(() => null);
        if (manifest?.blob_key === document.blob_key) await store.delete(manifestKey);
      }

      const client = await db.pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `DELETE FROM econ_fv_lead_attachments
            WHERE lead_id = $1 AND attachment_type = $2 AND blob_key = $3`,
          [document.lead_id, document.attachment_type, document.blob_key]
        );
        await client.query(
          `UPDATE econ_fv_documents
              SET blob_key = NULL,
                  original_filename = NULL,
                  content_type = NULL,
                  size_bytes = NULL,
                  status = 'deleted',
                  is_current = FALSE,
                  deleted_at = NOW(),
                  metadata = metadata || '{"retention_deleted":true}'::jsonb
            WHERE document_id = $1 AND deleted_at IS NULL`,
          [document.document_id]
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
      deleted += 1;
    } catch (error) {
      failed += 1;
      console.error("ECON document retention failed", {
        document_id: document.document_id,
        lead_id: document.lead_id,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return Response.json({ scanned: expired.length, deleted, failed }, {
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
};

export const config = {
  schedule: "0 2 * * 0",
};
