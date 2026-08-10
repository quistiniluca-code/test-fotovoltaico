export function env(name, fallback = "") {
  const netlify = globalThis.Netlify;
  const value = netlify?.env?.get?.(name) ?? process.env[name];
  return typeof value === "string" && value.length ? value : fallback;
}

export function envBool(name, fallback = false) {
  const value = env(name, fallback ? "true" : "false").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
}

export function envNum(name, fallback) {
  const value = Number(env(name, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}
