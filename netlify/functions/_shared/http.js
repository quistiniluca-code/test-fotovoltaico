import { env } from "./env.js";

export function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export async function readJson(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) {
    throw new Error("content_type_must_be_json");
  }
  return await request.json();
}

function configuredAllowedOrigins() {
  const raw = env("ECON_ALLOWED_ORIGINS");
  if (!raw) return new Set();
  const origins = raw
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => {
      try {
        return new URL(value).origin;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
  return new Set(origins);
}

export function sameOriginRequest(request) {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return true;
  try {
    const origin = new URL(originHeader).origin;
    const requestOrigin = new URL(request.url).origin;
    if (origin === requestOrigin) return true;
    return configuredAllowedOrigins().has(origin);
  } catch {
    return false;
  }
}

export const __test = { configuredAllowedOrigins };
