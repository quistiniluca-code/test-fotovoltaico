import { env } from "./_shared/env.js";
import { json, readJson, sameOriginRequest } from "./_shared/http.js";
import { safeSessionId } from "./_shared/sanitize.js";
import { createParserTicket } from "./_shared/ticket.js";

export default async (request) => {
  if (request.method !== "POST") return json({ detail: "method_not_allowed" }, 405);
  if (!sameOriginRequest(request)) return json({ detail: "origin_not_allowed" }, 403);
  const secret = env("ECON_PARSER_SHARED_SECRET");
  if (!secret || secret.length < 24) return json({ detail: "parser_secret_not_configured" }, 503);
  try {
    const body = await readJson(request);
    const sid = safeSessionId(body.session_id);
    if (!sid) return json({ detail: "invalid_session_id" }, 400);
    return json({ ticket: createParserTicket(secret, sid, 300), expires_in: 300 });
  } catch (error) {
    return json({ detail: error instanceof Error ? error.message : "invalid_request" }, 400);
  }
};

export const config = {
  path: "/api/parser/ticket",
  rateLimit: { windowLimit: 12, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
