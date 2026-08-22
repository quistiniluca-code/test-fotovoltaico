import { env } from "./_shared/env.js";
import { json } from "./_shared/http.js";
import { databaseStatus } from "./_shared/database.js";
import { serviceAreaConfigSummary } from "./_shared/service-area.js";
import { engagementDatabaseStatus } from "./_shared/engagement-store.js";

export default async () => {
  const crmMode = env("ECON_CRM_MODE", "blobs").toLowerCase();
  const privacyUrl = env("ECON_PRIVACY_URL");
  const privacyVersion = env("ECON_PRIVACY_VERSION");
  const privacyReady = Boolean(privacyUrl && /^https:\/\//i.test(privacyUrl) && privacyVersion);

  let databaseReady = null;
  let databaseTables = null;
  if (crmMode === "dual" || crmMode === "database") {
    try {
      const [status, engagementStatus] = await Promise.all([databaseStatus(), engagementDatabaseStatus()]);
      databaseReady = status.ready && engagementStatus.ready;
      databaseTables = {
        leads: status.leads_table,
        events: status.events_table,
        attachments: status.attachments_table,
        contacts: status.contacts_table,
        requests: status.requests_table,
        documents: status.documents_table,
        engagements: engagementStatus.engagements_table,
      };
    } catch {
      databaseReady = false;
      databaseTables = { leads: false, events: false, attachments: false, contacts: false, requests: false, documents: false, engagements: false };
    }
  }

  const leadStorage = crmMode === "blobs"
    ? "netlify_blobs"
    : crmMode === "dual"
      ? "netlify_blobs+netlify_database"
      : crmMode === "database"
        ? "netlify_database"
        : crmMode === "webhook"
          ? "crm_webhook"
          : "disabled";

  return json({
    ok: true,
    version: "1.8-data-layer-v3",
    data_layer_version: "data-layer-v3",
    service_area_version: "econ.service-area.v1",
    meta_signal_quality_version: "econ.meta-signal.v2",
    meta_funnel_version: "econ.meta-funnel.v3",
    commercial_quality_version: "econ.commercial-quality.v1",
    bill_archive_version: "lead-bill-archive-v2",
    bill_parser_mode: "browser-local",
    bill_parser_version: "econ-bill-parser-v2.0",
    bill_parser_external_service: false,
    bill_file_stored: true,
    bill_file_storage: "netlify_blobs",
    bill_archive_on_parse_failure: true,
    bill_max_file_bytes: 4 * 1024 * 1024,
    bill_signature_validation: true,
    document_history: true,
    document_retention_days: 180,
    contact_case_separation: true,
    request_idempotency: true,
    event_idempotency: true,
    service_area: serviceAreaConfigSummary(),
    meta_lead_service_area_filter: true,
    meta_qualified_lead_event: "QualifiedLead",
    meta_service_area_event: "ServiceAreaQualified",
    meta_service_area_event_endpoint: "/api/meta/service-area",
    meta_service_area_event_mode: "diagnostic",
    meta_journey_event_endpoint: "/api/meta/journey",
    meta_journey_events: ["PageView", "TestStarted", "WhatsAppIntent"],
    meta_pageview_capi_coverage: true,
    meta_pageview_pixel_capi_dedup: true,
    meta_whatsapp_intent_mode: "diagnostic_in_area_only",
    meta_capi_enhanced_matching: true,
    meta_capi_client_ip_from_netlify_context: true,
    crm_whatsapp_intent_capture: true,
    crm_engagement_store: "econ-fv-engagements-v1",
    admin_funnel_endpoint: "/api/admin/funnel",
    admin_funnel_dashboard: "/admin/funnel.html",
    nonproduction_blob_scope: "deploy",
    duplicate_conversion_suppression: true,
    lead_storage: leadStorage,
    database_ready: databaseReady,
    database_tables: databaseTables,
    privacy_ready: privacyReady,
    admin_auth_configured: true,
  });
};

export const config = { path: "/api/health" };
