import { env } from "./_shared/env.js";
import { json } from "./_shared/http.js";
import { databaseStatus } from "./_shared/database.js";

export default async () => {
  const crmMode = env("ECON_CRM_MODE", "blobs").toLowerCase();
  const privacyUrl = env("ECON_PRIVACY_URL");
  const privacyVersion = env("ECON_PRIVACY_VERSION");
  const privacyReady = Boolean(privacyUrl && /^https:\/\//i.test(privacyUrl) && privacyVersion);

  let databaseReady = null;
  let databaseTables = null;
  if (crmMode === "dual" || crmMode === "database") {
    try {
      const status = await databaseStatus();
      databaseReady = status.ready;
      databaseTables = {
        leads: status.leads_table,
        events: status.events_table,
      };
    } catch {
      databaseReady = false;
      databaseTables = { leads: false, events: false };
    }
  }

  const leadStorage = crmMode === "blobs"
    ? "netlify_blobs"
    : crmMode === "dual"
      ? "netlify_blobs+netlify_database"
      : crmMode === "database"
        ? "netlify_database+blobs_fallback"
        : crmMode === "webhook"
          ? "crm_webhook"
          : "disabled";

  return json({
    ok: true,
    version: "1.8-launch",
    data_layer_version: "database-dual-write-v1",
    bill_parser_mode: "browser-local",
    bill_parser_external_service: false,
    bill_file_stored: false,
    lead_storage: leadStorage,
    database_ready: databaseReady,
    database_tables: databaseTables,
    privacy_ready: privacyReady,
    admin_auth_configured: true,
  });
};

export const config = { path: "/api/health" };
