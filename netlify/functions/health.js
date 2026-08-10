import { env } from "./_shared/env.js";
import { json } from "./_shared/http.js";

export default async () => {
  const parserUrl = env("ECON_PARSER_API_URL");
  let parser = { configured: Boolean(parserUrl), reachable: false };
  if (parserUrl) {
    try {
      const healthUrl = new URL(parserUrl);
      healthUrl.pathname = healthUrl.pathname.replace(/\/parse\/?$/, "/health");
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(2500) });
      parser = { configured: true, reachable: response.ok };
    } catch {
      parser = { configured: true, reachable: false };
    }
  }
  return json({
    ok: true,
    version: "1.6",
    parser,
    crm_mode: env("ECON_CRM_MODE", "blobs"),
    privacy_configured: Boolean(env("ECON_PRIVACY_URL")),
  });
};

export const config = { path: "/api/health" };
