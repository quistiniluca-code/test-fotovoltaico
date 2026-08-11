# ECON — Test Fotovoltaico V1.7

Repository operativo per il funnel retail ECON “Quanto sei pronto per il fotovoltaico?”.

## Architettura V1.7

La V1.7 richiede soltanto **GitHub + Netlify**.

- `public/index.html`: funnel mobile-first completo.
- `public/assets/bill-parser.js`: estrazione dati bolletta eseguita localmente nel browser.
- PDF.js: lettura del layer testuale dei PDF.
- Tesseract.js + modello italiano: OCR locale per PDF scansionati e immagini.
- `scripts/vendor-browser-libs.mjs`: copia PDF.js, worker, core WASM e traineddata dentro `public/vendor` durante la build Netlify.
- `netlify/functions`: lead, analytics, configurazione e funzioni leggere.
- Netlify Blobs: archivio pre-live di lead/eventi quando `ECON_CRM_MODE=blobs`.

**La bolletta non viene inviata a un servizio OCR esterno e non viene salvata dal parser.** Il file rimane nel dispositivo dell’utente durante la lettura. Il browser restituisce un JSON `econ.bill.v1`; l’utente conferma i dati prima della mini-diagnosi.

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
2. patch V1.7 del frontend;
3. controllo sintassi Functions;
4. quality gate del repository e del parser browser.

## Lettura bolletta

Percorso:

1. PDF testuale → PDF.js legge il testo nel browser.
2. Se il testo è insufficiente o manca il consumo di riferimento → OCR locale.
3. PDF scansionato → fino a 5 pagine vengono renderizzate nel browser e lette da Tesseract.js.
4. Foto JPG/PNG/WebP → OCR locale.
5. Il parser prova a rilevare consumo, spesa, periodo, importo fattura, POD, potenza, fasce e indirizzo.
6. I campi derivati sono marcati `CALCOLATO DA BOLLETTA`; i valori trovati direttamente sono `DATO DA BOLLETTA`.
7. Prima della diagnosi l’utente conferma o corregge i dati principali.

Limite prudenziale client-side: 20 MB per file. L’OCR è più lento del parsing testuale e dipende dalle prestazioni del dispositivo.

## CRM

Pre-live:

`ECON_CRM_MODE=blobs`

Production, se viene collegato un CRM:

`ECON_CRM_MODE=webhook`

con `ECON_CRM_WEBHOOK_URL` e, se necessario, `ECON_CRM_WEBHOOK_TOKEN`.

## Privacy

Configurare prima del go-live:

- `ECON_PRIVACY_URL`
- `ECON_PRIVACY_VERSION`

La richiesta commerciale FV resta separata dalla presa visione privacy e non è preselezionata.

## Indirizzo

Per mantenere l’architettura GitHub + Netlify only, l’autocomplete esterno è **disabilitato di default** (`ECON_GEOCODER_PROVIDER=disabled`). L’indirizzo può essere inserito manualmente o precompilato dal dato di fornitura letto dalla bolletta.

## Quality gate

GitHub Actions verifica automaticamente:

- generazione degli asset PDF.js/Tesseract locali;
- presenza del modello OCR italiano;
- sintassi delle Netlify Functions;
- sintassi del parser browser;
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
6. Lead salvato correttamente.
7. Opt-in commerciale separato.
8. Informativa privacy approvata e versionata.

I risultati economici restano simulazioni preliminari e non vengono presentati come dati misurati o garantiti.
