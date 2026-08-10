# ECON — Test Fotovoltaico V1.6

Repository Netlify-ready per il funnel retail ECON “Quanto sei pronto per il fotovoltaico?”.

## Architettura

- `public/index.html`: frontend mobile-first del test.
- `netlify/functions`: API leggere per config, ticket parser, lead, analytics e geocoding.
- `parser-service`: parser Python/FastAPI separato per PDF testuali e OCR.
- Netlify Blobs: archivio pre-live di lead ed eventi quando `ECON_CRM_MODE=blobs`.
- CRM webhook: modalità production opzionale con idempotency key.

La bolletta non viene salvata dal parser. Il browser ottiene da Netlify un ticket HMAC breve e invia il file direttamente al parser esterno. Il parser restituisce un JSON `econ.bill.v1`; il frontend chiede conferma dei dati prima della mini diagnosi.

## Deploy frontend su Netlify

1. In Netlify scegli **Add new project → Import an existing project**.
2. Seleziona GitHub e il repository `quistiniluca-code/test-fotovoltaico`.
3. `netlify.toml` configura automaticamente:
   - build command: `npm run build`
   - publish directory: `public`
   - functions directory: `netlify/functions`
   - Node.js 22
4. Configura le Environment Variables copiando i nomi da `.env.example`.
5. Prima del traffico reale usa un Deploy Preview e verifica `/api/health`.

## Parser bollette

Il parser non gira su Netlify. Distribuisci `parser-service/` su un servizio container compatibile Docker.

Configurazione minima del parser:

- `ECON_PARSER_SHARED_SECRET`: segreto casuale di almeno 32 caratteri.
- `ECON_ALLOWED_ORIGINS`: URL del sito Netlify autorizzato.
- `ECON_MAX_UPLOAD_MB=12`.
- `OCR_LANG=ita+eng`.

Su Netlify imposta lo stesso `ECON_PARSER_SHARED_SECRET` e:

`ECON_PARSER_API_URL=https://<parser-host>/parse`

Il frontend richiede prima `/api/parser/ticket`; il ticket dura 5 minuti e viene verificato dal parser.

## CRM

Pre-live:

`ECON_CRM_MODE=blobs`

I lead vengono salvati nello store privato Netlify Blobs `econ-fv-leads-prelive`.

Production:

`ECON_CRM_MODE=webhook`

Imposta anche `ECON_CRM_WEBHOOK_URL` e, se necessario, `ECON_CRM_WEBHOOK_TOKEN`. La Function invia `econ.lead.v1` server-to-server con `Idempotency-Key`.

## Privacy

Prima del go-live sostituisci i valori placeholder:

- `ECON_PRIVACY_URL`
- `ECON_PRIVACY_VERSION`

La richiesta commerciale FV è separata dalla presa visione privacy e non è preselezionata.

## Geocoding

La configurazione iniziale usa Nominatim soltanto come provider di test. Per campagne live ad alto volume va configurato un provider adeguato al traffico atteso.

## Quality gate

GitHub Actions verifica automaticamente:

- sintassi delle Netlify Functions;
- struttura minima del repository;
- assenza di POD reali hard-coded;
- sintassi Python del parser.

Comandi locali:

```bash
npm install
npm run build
npx netlify dev
```

Parser locale:

```bash
cd parser-service
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8080
```

## Gate prima del live

1. Deploy Preview Netlify riuscito.
2. Parser esterno raggiungibile da `/api/health`.
3. Test con HERA, E.ON OCR, Dolomiti, Octopus e Plenitude.
4. Conferma dati letti prima della diagnosi.
5. Lead salvato correttamente.
6. Opt-in commerciale separato.
7. Informativa privacy approvata e versionata.
8. Provider geocoding production configurato.

I risultati economici mostrati dal test sono simulazioni preliminari e devono restare distinti dai dati effettivamente letti dalla bolletta.
