import { createHmac, timingSafeEqual } from "node:crypto";

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

export function createParserTicket(secret, sessionId, ttlSeconds = 300) {
  const payload = {
    v: 1,
    sid: sessionId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyParserTicket(secret, token) {
  const [body, sig] = token.split(".");
  if (!body || !sig) return { ok: false };
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return { ok: false };
    return { ok: true, payload };
  } catch {
    return { ok: false };
  }
}
