const BLOCKED_KEYS = new Set([
  "name", "first_name", "last_name", "email", "mobile", "phone", "telephone",
  "address", "street", "civic", "postal", "city", "pod", "filename", "file_name",
  "bill", "raw_text", "ocr_text", "document_text"
]);

export function sanitizeEventDetail(value, depth = 0) {
  if (depth > 4) return "[max-depth]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.slice(0, 160);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(v => sanitizeEventDetail(v, depth + 1));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (BLOCKED_KEYS.has(k.toLowerCase())) continue;
      out[k] = sanitizeEventDetail(v, depth + 1);
    }
    return out;
  }
  return String(value).slice(0, 160);
}

export function safeSessionId(value) {
  const s = String(value ?? "").trim();
  return /^[A-Za-z0-9._:-]{8,160}$/.test(s) ? s : "";
}

export function safeRequestId(value) {
  const s = String(value ?? "").trim();
  return /^[A-Za-z0-9._:-]{8,180}$/.test(s) ? s : "";
}
