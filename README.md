# ECON — Test Fotovoltaico V1.8

Repository operativo per il funnel retail ECON “Quanto sei pronto per il fotovoltaico?”.

## Architettura V1.8

La V1.8 richiede soltanto **GitHub + Netlify**.

- `public/index.html`: funnel mobile-first completo.
- `public/assets/bill-parser.js`: estrazione dati bolletta eseguita localmente nel browser.
- PDF.js: lettura del layer testuale dei PDF.
- Tesseract.js + modello italiano: OCR locale per PDF scansionati e immagini.
- `scripts/vendor-browser-libs.mjs`: copia PDF.js, worker, core WASM e traineddata dentro `public/vendor` durante la build Netlify.
- `netlify/functions/leads.js`: endpoint di acquisizione lead.
- `netlify/functions/admin-leads.js`: lettura protetta e export dei lead archiviati.
- Netlify Blobs: archivio persistente pre-live di lead ed eventi quando `ECON_CRM_MODE=blobs`.

**La bolletta non viene inviata a un servizio OCR esterno e non viene salvata dal parser.** Il file rimane nel dispositivo dell’utente durante la lettura. Nel lead vengono salvati soltanto i dati strutturati necessari al risultato e alla qualificazione.

## Deploy Netlify

Il repository è collegato al progetto Netlify `test-fotovoltaico`.

`netlify.toml` configura:

- build: `npm run build`
- publish: `public`
- functions: `netlify/functions`
- Node.js 22
- CSP compatibile con i Web Worker locali di PDF.js/Tesseract.js.

La build esegue:

1. vendor delle dipendenze browser locali;
2. patch V1.8 del frontend;
3. regression test del parser bollette;
4. test del contratto lead/storage;
5. controllo sintassi Functions;
6. quality gate del repository.

## Lettura bolletta

Percorso:

1. PDF testuale → PDF.js legge il testo nel browser.
2. Se il testo è insufficiente o manca il consumo di riferimento → OCR locale.
3. PDF scansionato → fino a 5 pagine vengono renderizzate nel browser e lette da Tesseract.js.
4. Foto JPG/PNG/WebP → OCR locale.
5. Il parser prova a rilevare consumo, spesa, periodo, importo fattura, potenza, fasce e indirizzo.
6. I campi derivati sono marcati `CALCOLATO DA BOLLETTA`; i valori trovati direttamente sono `DATO DA BOLLETTA`.
7. Prima della diagnosi l’utente conferma o corregge i dati principali.

Limite prudenziale client-side: 20 MB per file. L’OCR è più lento del parsing testuale e dipende dalle prestazioni del dispositivo.

## Acquisizione lead

Modalità pre-live:

`ECON_CRM_MODE=blobs`

Il comando finale del funnel invia `econ.lead.v1` a:

`POST /api/leads`

La Function valida lato server:

- sessione;
- presa visione privacy;
- nome e cognome;
- email;
- cellulare;
- indirizzo dell’immobile.

Il record viene salvato nello store Netlify Blobs:

`econ-fv-leads-prelive`

con chiave deterministica `lead/<lead_id>`. Un nuovo invio della stessa sessione aggiorna lo stesso lead invece di crearne uno duplicato.

Il record persistente usa lo schema `econ.lead.record.v1` e aggiunge timestamp server-side `created_at` e `updated_at`. Il payload include contatto, indirizzo, score, risposte del test e riepilogo strutturato dei dati utili letti/confermati dalla bolletta. Il file della bolletta non viene archiviato.

## Verifica e consultazione lead

Endpoint protetto:

`GET /api/admin/leads`

Autenticazione:

`Authorization: Bearer <token amministratore>`

La Function usa in priorità `ECON_ADMIN_TOKEN` se disponibile. Se il secret runtime non è disponibile, usa un fallback sicuro basato sul digest SHA-256 del token: nel repository è presente soltanto l’hash, non il token in chiaro. Il digest può essere ruotato tramite `ECON_ADMIN_AUTH_DIGEST` oppure aggiornando il fallback nel codice.

Parametri disponibili:

- `limit=50` massimo 250;
- `offset=0`;
- `detail=full` per vedere il record completo;
- `format=csv` per esportare un CSV operativo.

Senza token corretto l'endpoint non restituisce i lead.

## CRM

Quando verrà collegato un CRM:

`ECON_CRM_MODE=webhook`

con `ECON_CRM_WEBHOOK_URL` e, se necessario, `ECON_CRM_WEBHOOK_TOKEN`.

## Privacy

Configurare prima del go-live:

- `ECON_PRIVACY_URL`
- `ECON_PRIVACY_VERSION`

Configurazione production verificata il 2026-08-11:

- `ECON_CRM_MODE=blobs`;
- `ECON_PRIVACY_URL=https://www.econ-apex.com/privacy`;
- `ECON_PRIVACY_VERSION=2025-09-07`.

La richiesta commerciale FV resta separata dalla presa visione privacy e non è preselezionata.

## Indirizzo

Per mantenere l’architettura GitHub + Netlify only, l’autocomplete esterno è **disabilitato di default** (`ECON_GEOCODER_PROVIDER=disabled`). L’indirizzo può essere inserito manualmente o precompilato dal dato di fornitura letto dalla bolletta.

## Quality gate

GitHub Actions verifica automaticamente:

- generazione degli asset PDF.js/Tesseract locali;
- presenza del modello OCR italiano;
- regressioni del parser bollette;
- contratto di validazione e serializzazione lead;
- sintassi delle Netlify Functions;
- presenza del salvataggio Netlify Blobs e dell'admin inspector;
- assenza del vecchio endpoint `/api/parser/ticket` nel frontend;
- presenza delle schermate chiave del funnel;
- assenza di POD reali hard-coded.

Comandi locali:

```bash
npm install
npm run build
npx netlify dev
```

## Gate prima del traffico reale

1. Deploy Preview Netlify riuscito.
2. Test PDF testuale con HERA, Dolomiti, Octopus e Plenitude.
3. Test OCR con E.ON/scansione.
4. Conferma dati letti prima della diagnosi.
5. Mini-diagnosi coerente con i dati confermati.
6. Lead reale salvato correttamente in Netlify Blobs.
7. Lead visibile tramite `/api/admin/leads` con token amministratore.
8. Opt-in commerciale separato.
9. Informativa privacy approvata e versionata.

I risultati economici restano simulazioni preliminari e non vengono presentati come dati misurati o garantiti.
