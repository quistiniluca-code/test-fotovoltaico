import { env } from "./_shared/env.js";
import { json } from "./_shared/http.js";

const clean = (value) => String(value ?? "").trim();

export default async (request) => {
  if (request.method !== "GET") return json({ detail: "method_not_allowed" }, 405);
  const provider = env("ECON_GEOCODER_PROVIDER", "nominatim-test").toLowerCase();
  if (provider === "disabled") return json({ detail: "geocoder_disabled" }, 503);
  const url = new URL(request.url);
  const q = clean(url.searchParams.get("q"));
  if (q.length < 4 || q.length > 180) return json({ detail: "invalid_query" }, 400);
  if (provider !== "nominatim-test" && provider !== "nominatim") return json({ detail: "geocoder_provider_not_implemented" }, 501);

  const endpoint = env("ECON_GEOCODER_URL", "https://nominatim.openstreetmap.org/search");
  const upstream = new URL(endpoint);
  upstream.searchParams.set("q", q);
  upstream.searchParams.set("format", "jsonv2");
  upstream.searchParams.set("addressdetails", "1");
  upstream.searchParams.set("countrycodes", "it");
  upstream.searchParams.set("limit", "5");
  try {
    const response = await fetch(upstream, {
      headers: {
        accept: "application/json",
        "user-agent": env("ECON_GEOCODER_USER_AGENT", "ECON-FV-Test/1.6 (econ-apex.com)"),
      },
      signal: AbortSignal.timeout(6500),
    });
    if (!response.ok) return json({ detail: "geocoder_upstream_error" }, 502);
    const rows = await response.json();
    const results = (Array.isArray(rows) ? rows : []).slice(0, 5).map((row) => {
      const a = row.address || {};
      return {
        display_name: clean(row.display_name),
        street: clean(a.road || a.pedestrian || a.residential || a.path),
        civic: clean(a.house_number),
        postal: clean(a.postcode),
        city: clean(a.city || a.town || a.village || a.municipality),
        province: clean(a.province || a.county || a.state_district),
        lat: clean(row.lat),
        lon: clean(row.lon),
        provider: "nominatim",
      };
    });
    return json({ results });
  } catch {
    return json({ detail: "geocoder_unavailable" }, 502);
  }
};

export const config = { path: "/api/address/suggest" };
