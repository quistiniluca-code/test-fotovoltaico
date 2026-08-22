# Meta Funnel + CRM V3

Purpose: increase Meta Conversions API coverage without weakening ECON lead quality, and make WhatsApp acquisition visible in first-party CRM reporting.

## Event semantics

- `PageView`: micro event. Pixel + CAPI, shared event ID, marketing consent required.
- `TestStarted`: micro event. Pixel + CAPI, shared event ID, marketing consent required.
- `ServiceAreaQualified`: qualification event. Existing server-side service-area classification remains authoritative. Only `IN_AREA` is sent to Meta.
- `Lead`: conversion event. New persisted lead + `IN_AREA` + marketing consent.
- `QualifiedLead`: quality conversion. `Lead` + `commercial_fv_request=true`.
- `WhatsAppIntent`: intent event, never treated as a sale or QualifiedLead. Every click is stored first-party in the ECON engagement CRM store. Meta receives the custom event only for `IN_AREA` sessions with marketing consent.

The campaign optimization event remains `Lead`. `ServiceAreaQualified`, `QualifiedLead` and `WhatsAppIntent` remain diagnostic until volume supports a deliberate optimization change.

## Meta matching

CAPI uses the strongest available consented matching data without treating the property location as the person's residence:

- normalized/hash email;
- normalized/hash phone, including Italian country-code normalization;
- normalized/hash first and last name when available;
- hashed deterministic external ID;
- trusted Netlify client IP;
- user agent;
- `_fbp` and `_fbc` when present;
- `fbclid` fallback to construct `fbc` when the cookie is unavailable.

## First-party telemetry

Every first-party event is enriched with the available acquisition and funnel context: derived platform, UTM source/medium/campaign/content, service-area status, property province, decision horizon, bill state, commercial-request state, lead/contact IDs.

A `session_exit` event records the last observed step so abandonment can be analyzed independently from Meta attribution.

## WhatsApp CRM

`WhatsAppIntent` is written to the deploy-scoped Netlify Blob store `econ-fv-engagements-v1` and, in dual/database mode, to `econ_fv_engagements`. The engagement is linked by deterministic session/lead identity but remains a distinct engagement record: a click is not promoted to a lead, QualifiedLead, appointment or sale.

## Commercial quality score

`econ.commercial-quality.v1` is an operational score separate from the technical FV score:

- service area: 40 points;
- explicit commercial request: 25 points;
- bill evidence: up to 15 points;
- decision horizon: up to 15 points;
- WhatsApp intent: 5 points.

`OUT_OF_AREA` and `UNKNOWN_AREA` remain explicit operational grades regardless of numeric score.

## Administration

Protected API: `/api/admin/funnel`

Dashboard UI: `/admin/funnel.html`

The dashboard exposes PageView → TestStarted → ServiceAreaQualified → Lead → QualifiedLead → WhatsAppIntent, source/platform breakdown, service-area breakdown, last-screen drop-off, commercial quality distribution, recent leads and WhatsApp intents. CSV exports are available for leads and engagements through the same protected API.
