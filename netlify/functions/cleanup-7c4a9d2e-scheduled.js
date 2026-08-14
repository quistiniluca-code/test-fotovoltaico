import { getStore } from "@netlify/blobs";
import { getDatabase } from "@netlify/database";

const LEAD_STORE = "econ-fv-leads-prelive";
const EVENT_STORE = "econ-fv-events-v1";
const MAINTENANCE_STORE = "econ-fv-maintenance";
const MARKER_KEY = "cleanup/prelaunch-2026-08-14";

async function clearStore(name) {
  const store = getStore(name, { consistency: "strong" });
  const { blobs } = await store.list();
  for (const blob of blobs) await store.delete(blob.key);
  const after = await store.list();
  return { store: name, deleted: blobs.length, remaining: after.blobs.length };
}

export default async () => {
  const maintenance = getStore(MAINTENANCE_STORE, { consistency: "strong" });
  const alreadyDone = await maintenance.get(MARKER_KEY, { type: "json" });
  if (alreadyDone?.ok === true) {
    console.log("ECON prelaunch cleanup already completed", alreadyDone);
    return;
  }

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

  const result = {
    ok: true,
    completed_at: new Date().toISOString(),
    database: {
      leads: { before: beforeLeads?.count || 0, after: afterLeads?.count || 0 },
      events: { before: beforeEvents?.count || 0, after: afterEvents?.count || 0 },
    },
    blobs: { leads: leadBlobs, events: eventBlobs },
  };

  await maintenance.setJSON(MARKER_KEY, result);
  console.log("ECON prelaunch cleanup completed", result);
};

export const config = { schedule: "* * * * *" };
