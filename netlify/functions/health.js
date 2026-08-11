import { env } from "./_shared/env.js";
import { json } from "./_shared/http.js";

export default async () => {
  const crmMode = env("ECON_CRM_MODE", "blobs").toLowerCase();
  const privacyUrl = env("ECON_PRIVACY_URL");
  const privacyVersion = env("ECON_PRIVACY_VERSION");
  const privacyReady = Boolean(privacyUrl && /^https:\/\//i.test(privacyUrl) && privacyVersion);

  return json({
    ok: true,
    version: "1.8-launch",
    bill_parser_mode: "browser-local",
    bill_parser_external_service: false,
    bill_file_stored: false,
    lead_storage: crmMode === "blobs" ? "netlify_blobs" : crmMode === "webhook" ? "crm_webhook" : "disabled",
    privacy_ready: privacyReady,
    admin_auth_configured: true,
  });
};

export const config = { path: "/api/health" };
