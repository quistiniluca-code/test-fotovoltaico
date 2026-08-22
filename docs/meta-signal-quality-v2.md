# Meta Signal Quality V2

Purpose: increase Meta learning signal quality without increasing campaign budget or re-admitting out-of-area leads as successful conversions.

## 1. Enhanced CAPI matching

For consented Meta events, CAPI now uses the strongest first-party match fields already available to ECON without treating property location as the person's residence:

- email SHA-256
- phone SHA-256
- first name SHA-256
- last name SHA-256
- deterministic external ID SHA-256
- client IP from the trusted Netlify function context
- client user agent
- `_fbp`
- `_fbc`, with a fallback reconstructed from first-party `fbclid` attribution and landing timestamp when the cookie is unavailable

No property city, province or street address is sent as Meta `user_data`.

Marketing consent remains mandatory. Existing Lead and QualifiedLead service-area gating is unchanged.

## 2. ServiceAreaQualified

A new custom event is generated immediately after the property address is confirmed and server-side classification returns `IN_AREA`.

Flow:

`address_confirmed` → `/api/meta/service-area` → server classification → `ServiceAreaQualified`

The event is emitted through both Meta CAPI and Meta Pixel with the same deterministic event ID:

`lead_id + ':service-area'`

This allows browser/server deduplication and produces a higher-frequency territorial quality signal before the final lead form is completed.

OUT_OF_AREA and UNKNOWN cases are retained only in ECON first-party telemetry and are not sent to Meta as ServiceAreaQualified.

## 3. Rollout rule

`ServiceAreaQualified` is diagnostic only in V2. The current campaign must remain optimized on `Lead` until enough post-deploy volume exists to evaluate whether the intermediate event should become an optimization signal.

Do not increase budget merely to force the ad set out of learning while the new quality signal is still accumulating.

## 4. First-party telemetry

New/strengthened events:

- `service_area_checked`
- `service_area_qualified`
- `service_area_out_of_area`
- `service_area_signal_failed`

These events allow ECON to compare address-stage territorial quality against final Lead and QualifiedLead rates without relying only on Meta attribution.
