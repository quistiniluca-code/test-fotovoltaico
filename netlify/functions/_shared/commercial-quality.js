import { classifyLeadQuality } from "./service-area.js";

export const COMMERCIAL_QUALITY_VERSION = "econ.commercial-quality.v1";

const HORIZON_LABELS = Object.freeze([
  "Entro 3 mesi",
  "Tra 3 e 6 mesi",
  "Tra 6 e 12 mesi",
  "Più avanti",
  "Sto solo esplorando",
]);

function boundedIndex(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n < HORIZON_LABELS.length ? n : null;
}

export function decisionHorizonFromLead(lead = {}) {
  const index = boundedIndex(lead?.test?.answers?.decision_horizon);
  return {
    index,
    label: index == null ? null : HORIZON_LABELS[index],
  };
}

export function attributionPlatform(attribution = {}) {
  const source = String(attribution?.utm_source || "").trim().toLowerCase();
  const medium = String(attribution?.utm_medium || "").trim().toLowerCase();
  const referrer = String(attribution?.referrer_host || "").trim().toLowerCase();
  const hasFbclid = Boolean(String(attribution?.fbclid || "").trim());
  const hasGclid = Boolean(String(attribution?.gclid || "").trim());

  let platform = "direct";
  if (source.includes("instagram") || source === "ig" || referrer.includes("instagram.")) platform = "instagram";
  else if (source.includes("facebook") || source === "fb" || referrer.includes("facebook.")) platform = "facebook";
  else if (source.includes("meta") || hasFbclid) platform = "meta";
  else if (source.includes("google") || hasGclid || referrer.includes("google.")) platform = "google";
  else if (source) platform = source.slice(0, 40);
  else if (referrer) platform = "referral";

  const paid = hasFbclid || hasGclid || /(paid|cpc|ppc|social|ads?)/.test(medium);
  return { platform, paid, source: source || null, medium: medium || null };
}

function billEvidence(lead = {}) {
  if (lead?.bill_attachment?.attachment_id) return { points: 15, level: "file_uploaded" };
  const annualKwh = Number(lead?.bill_summary?.annual_kwh);
  const annualSpend = Number(lead?.bill_summary?.annual_spend);
  if ((Number.isFinite(annualKwh) && annualKwh > 0) || (Number.isFinite(annualSpend) && annualSpend > 0)) {
    return { points: 10, level: "energy_data_present" };
  }
  return { points: 0, level: "missing" };
}

function horizonPoints(index) {
  if (index === 0) return 15;
  if (index === 1) return 12;
  if (index === 2) return 8;
  if (index === 3) return 4;
  return 0;
}

export function commercialQualityScore(lead = {}, options = {}) {
  const quality = classifyLeadQuality(lead);
  const area = quality.service_area;
  const horizon = decisionHorizonFromLead(lead);
  const bill = billEvidence(lead);
  const hasWhatsappIntent = options?.has_whatsapp_intent === true;

  const components = {
    service_area: area.status === "IN_AREA" ? 40 : 0,
    commercial_request: lead?.contact?.commercial_fv_request === true ? 25 : 0,
    bill_evidence: bill.points,
    decision_horizon: horizonPoints(horizon.index),
    whatsapp_intent: hasWhatsappIntent ? 5 : 0,
  };
  const score = Math.max(0, Math.min(100, Object.values(components).reduce((sum, value) => sum + value, 0)));
  const operationalGrade = area.status === "OUT_OF_AREA"
    ? "OUT_OF_AREA"
    : area.status === "UNKNOWN"
      ? "UNKNOWN_AREA"
      : score >= 75
        ? "A"
        : score >= 55
          ? "B"
          : score >= 35
            ? "C"
            : "D";

  return {
    version: COMMERCIAL_QUALITY_VERSION,
    score,
    grade: operationalGrade,
    eligible_service_area: area.status === "IN_AREA",
    service_area_status: area.status,
    service_area_region: area.region,
    service_area_province_code: area.province_code,
    commercial_request: lead?.contact?.commercial_fv_request === true,
    decision_horizon_index: horizon.index,
    decision_horizon: horizon.label,
    bill_evidence: bill.level,
    has_whatsapp_intent: hasWhatsappIntent,
    components,
  };
}

export const __test = { HORIZON_LABELS, boundedIndex, billEvidence, horizonPoints };
