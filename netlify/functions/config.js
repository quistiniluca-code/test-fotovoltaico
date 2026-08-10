import { env, envBool, envNum } from "./_shared/env.js";
import { json } from "./_shared/http.js";

export default async () => {
  const crmMode = env("ECON_CRM_MODE", "blobs").toLowerCase();
  const parserUrl = env("ECON_PARSER_API_URL");
  const geocoderProvider = env("ECON_GEOCODER_PROVIDER", "nominatim-test").toLowerCase();
  return json({
    version: "1.6",
    privacy_url: env("ECON_PRIVACY_URL") || null,
    privacy_version: env("ECON_PRIVACY_VERSION", "v1.6-prelive"),
    bill_file_stored: false,
    parser_api_url: parserUrl || null,
    parser_ticket_required: true,
    local_parser_fallback: envBool("ECON_LOCAL_PARSER_FALLBACK", false),
    crm_connected: crmMode === "webhook" && Boolean(env("ECON_CRM_WEBHOOK_URL")),
    crm_mode: crmMode,
    address_autocomplete: geocoderProvider !== "disabled",
    geocoder_provider: geocoderProvider,
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
