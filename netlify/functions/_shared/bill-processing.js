const PARSE_STATUSES = new Set(["selected", "processing", "parsed", "parse_failed", "not_attempted"]);
const DATA_MODES = new Set(["bill", "estimate", "unknown"]);

function text(value, max = 160) {
  const s = String(value ?? "").trim();
  return s ? s.slice(0, max) : null;
}

function token(value, max = 80) {
  const s = String(value ?? "").trim().toLowerCase();
  return /^[a-z0-9._:@+-]+$/.test(s) ? s.slice(0, max) : null;
}

export function normalizeBillProcessing(value = {}) {
  const rawStatus = String(value?.parse_status || "").trim().toLowerCase();
  const rawMode = String(value?.data_mode || "").trim().toLowerCase();
  return {
    schema: "econ.bill.processing.v1",
    parse_status: PARSE_STATUSES.has(rawStatus) ? rawStatus : "not_attempted",
    parser_mode: token(value?.parser_mode, 40),
    parser_version: text(value?.parser_version, 80),
    engine: token(value?.engine, 40),
    engine_version: text(value?.engine_version, 40),
    error_code: token(value?.error_code, 80),
    error_detail: text(value?.error_detail, 180),
    data_mode: DATA_MODES.has(rawMode) ? rawMode : "unknown",
    data_confirmed: value?.data_confirmed === true,
  };
}

export const __test = { PARSE_STATUSES, DATA_MODES, text, token };
