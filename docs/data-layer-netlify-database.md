# ECON FV data layer

Production data flow after the Netlify Database migration:

- Frontend payload and `/api/leads` contract remain unchanged.
- Netlify Blobs remains the safety store and fallback.
- Netlify Database/Postgres receives the same lead and funnel-event data in dual-write mode.
- `econ_fv_leads` stores CRM/queryable lead fields plus the complete JSON payload.
- `econ_fv_events` stores funnel events for future relational analytics.
- Deploy Previews use isolated database branches; production uses the `production` database branch.
- Database migrations live under `netlify/database/migrations/` and are applied by Netlify during deploys.
- `/api/admin/leads` and `/api/analytics/summary` continue reading Blobs during the validation phase.

Current transition mode: `ECON_CRM_MODE=dual` in production and deploy previews.
