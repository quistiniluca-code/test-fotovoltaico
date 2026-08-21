import { env, envNum } from "./_shared/env.js";
import { json } from "./_shared/http.js";
import { serviceAreaConfigSummary } from "./_shared/service-area.js";

function publicTrackingId(name, pattern) {
  const value = String(env(name) || "").trim();
  return pattern.test(value) ? value : null;
}

export default async () => {
  const crmMode = env("ECON_CRM_MODE", "blobs").toLowerCase();
  const geocoderProvider = env("ECON_GEOCODER_PROVIDER", "disabled").toLowerCase();
  const privacyUrl = env("ECON_PRIVACY_URL");
  const privacyVersion = env("ECON_PRIVACY_VERSION");
  const privacyReady = Boolean(privacyUrl && /^https:\/\//i.test(privacyUrl) && privacyVersion);

  const googleAnalyticsId = publicTrackingId("ECON_GOOGLE_ANALYTICS_ID", /^G-[A-Z0-9]+$/i);
  const googleAdsId = publicTrackingId("ECON_GOOGLE_ADS_ID", /^AW-\d+$/i);
  const googleAdsConversionLabel = publicTrackingId("ECON_GOOGLE_ADS_CONVERSION_LABEL", /^[A-Z0-9_-]{6,120}$/i);
  const metaPixelId = publicTrackingId("ECON_META_PIXEL_ID", /^\d{5,25}$/);
  const trackingConfigured = Boolean(googleAnalyticsId || googleAdsId || metaPixelId);
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
    version: "1.8-data-layer-v3",
    data_layer_version: "data-layer-v3",
    service_area_version: "econ.service-area.v1",
    privacy_url: privacyReady ? privacyUrl : null,
    privacy_version: privacyReady ? privacyVersion : null,
    privacy_ready: privacyReady,
    bill_file_stored: true,
    bill_file_storage: "netlify_blobs",
    bill_attachment_endpoint: "/api/bill-attachments",
    bill_max_file_bytes: 4 * 1024 * 1024,
    bill_parser_mode: "browser-local",
    bill_parser_version: "econ-bill-parser-v2.0",
    bill_parser_external_service: false,
    bill_archive_on_parse_failure: true,
    bill_signature_validation: true,
    document_history: true,
    document_retention_days: 180,
    contact_case_separation: true,
    request_idempotency: true,
    event_idempotency: true,
    service_area: serviceAreaConfigSummary(),
    meta_lead_service_area_filter: true,
    meta_qualified_lead_event: "QualifiedLead",
    lead_submission_endpoint: "/api/leads",
    lead_storage: leadStorage,
    nonproduction_blob_scope: "deploy",
    crm_connected: crmMode === "webhook" && Boolean(env("ECON_CRM_WEBHOOK_URL")),
    crm_mode: crmMode,
    address_autocomplete: geocoderProvider !== "disabled",
    geocoder_provider: geocoderProvider,
    tracking: {
      configured: trackingConfigured,
      consent_mode: "basic",
      consent_version: "2026-08-13",
      google_analytics_id: googleAnalyticsId,
      google_ads_id: googleAdsId,
      google_ads_conversion_label: googleAdsConversionLabel,
      meta_pixel_id: metaPixelId,
    },
    economics: {
      pvYieldKwhPerKwp: envNum("ECON_PV_YIELD_KWH_PER_KWP", 1250),
      pvCostPerKwp: envNum("ECON_PV_COST_PER_KWP", 1350),
      minPvInvestment: envNum("ECON_MIN_PV_INVESTMENT", 5000),
      exportedEnergyValue: envNum("ECON_EXPORTED_ENERGY_VALUE", 0.06),
      fallbackAvoidableShare: envNum("ECON_FALLBACK_AVOIDABLE_SHARE", 0.74),
    },
  });
};

export const config = { path: "/api/config" };
