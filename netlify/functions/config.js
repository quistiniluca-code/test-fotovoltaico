import { env, envNum } from "./_shared/env.js";
import { json } from "./_shared/http.js";

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
  const metaPixelId = publicTrackingId("ECON_META_PIXEL_ID", /^\d{5,25}$/);
  const trackingConfigured = Boolean(googleAnalyticsId || googleAdsId || metaPixelId);

  return json({
    version: "1.8-consent-ready",
    privacy_url: privacyReady ? privacyUrl : null,
    privacy_version: privacyReady ? privacyVersion : null,
    privacy_ready: privacyReady,
    bill_file_stored: false,
    bill_parser_mode: "browser-local",
    bill_parser_external_service: false,
    lead_submission_endpoint: "/api/leads",
    lead_storage: crmMode === "blobs" ? "netlify_blobs" : crmMode === "webhook" ? "crm_webhook" : "disabled",
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
