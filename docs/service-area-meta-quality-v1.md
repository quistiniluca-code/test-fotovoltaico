# Service Area + Meta Quality V1

Purpose: stop teaching Meta that every saved ECON test is an equally useful commercial lead.

## Current service area

Default production logic follows the approved Meta geography as of 21 Aug 2026:

- Emilia-Romagna
- Friuli-Venezia Giulia
- Liguria
- Lombardia
- Piemonte
- Trentino-Alto Adige
- Valle d'Aosta

Veneto is intentionally not included by default because it was not present in the approved Meta audience control screenshot. The default can be changed without code through `ECON_SERVICE_AREA_REGIONS`, or overridden at province level with `ECON_SERVICE_AREA_PROVINCES`.

## Conversion semantics

`Lead` (Meta): new persisted lead + property classified `IN_AREA` + marketing tracking consent.

`QualifiedLead` (Meta custom event): same conditions as `Lead` + `commercial_fv_request=true`.

`OUT_OF_AREA` and `UNKNOWN` cases remain stored in ECON and remain visible in first-party analytics/admin exports, but are not sent to Meta as `Lead` or `QualifiedLead`.

Google Ads conversion behavior is intentionally unchanged in V1.

## Classification

The server resolves the property province from the explicit `property.province` field and falls back to the trailing province code in the formatted property address. The service-area decision is made server-side in `_shared/service-area.js`; browser data is not authoritative for Meta CAPI eligibility.

Admin CSV exports calculate the same classification for historical records, so existing leads can be segmented by `service_area_status`, `service_area_region`, `meta_lead_eligible`, and `qualified_lead_eligible` without rewriting old records.

## Meta deduplication

Meta Pixel and CAPI use the same deterministic event IDs:

- `Lead`: `lead_id`
- `QualifiedLead`: `lead_id + ':qualified'`

This preserves browser/server deduplication for both event types.

## Rollout rule

Keep the current campaign optimization event on `Lead` initially. Collect `QualifiedLead` as a quality signal until there is enough volume to evaluate a switch to a deeper conversion objective.
