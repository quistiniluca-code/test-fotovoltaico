import { getStore } from "@netlify/blobs";
import { getDatabase } from "@netlify/database";

const LEAD_STORE = "econ-fv-leads-prelive";
const EVENT_STORE = "econ-fv-events-v1";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function clearStore(name) {
  const store = getStore(name, { consistency: "strong" });
  const { blobs } = await store.list();
  for (const blob of blobs) await store.delete(blob.key);
  const after = await store.list();
  return { store: name, deleted: blobs.length, remaining: after.blobs.length };
}

export default async (request) => {
  if (request.method !== "GET") return json({ detail: "method_not_allowed" }, 405);

  const expected = Netlify.env.get("ECON_CLEANUP_TOKEN") || "";
  const supplied = new URL(request.url).searchParams.get("token") || "";
  if (!expected || supplied !== expected) return json({ detail: "unauthorized" }, 401);

  const db = getDatabase();
  const [beforeLeads] = await db.sql`SELECT COUNT(*)::int AS count FROM econ_fv_leads`;
  const [beforeEvents] = await db.sql`SELECT COUNT(*)::int AS count FROM econ_fv_events`;

  await db.sql`DELETE FROM econ_fv_events`;
  await db.sql`DELETE FROM econ_fv_leads`;

  const [afterLeads] = await db.sql`SELECT COUNT(*)::int AS count FROM econ_fv_leads`;
  const [afterEvents] = await db.sql`SELECT COUNT(*)::int AS count FROM econ_fv_events`;

  const [leadBlobs, eventBlobs] = await Promise.all([
    clearStore(LEAD_STORE),
    clearStore(EVENT_STORE),
  ]);

  return json({
    ok: true,
    database: {
      leads: { before: beforeLeads?.count || 0, after: afterLeads?.count || 0 },
      events: { before: beforeEvents?.count || 0, after: afterEvents?.count || 0 },
    },
    blobs: { leads: leadBlobs, events: eventBlobs },
  });
};

export const config = { path: "/api/internal/cleanup-test-data" };
