const CONSENT_STORAGE_KEY = 'econ_tracking_consent_v1';
const SIX_MONTHS_MS = 183 * 24 * 60 * 60 * 1000;

let trackingConfig = null;
let currentConsent = null;

const deniedGoogleConsent = {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

function safeReadConsent(version) {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || 'null');
    if (!parsed || parsed.version !== version || !Number.isFinite(parsed.saved_at)) return null;
    if (Date.now() - parsed.saved_at > SIX_MONTHS_MS) return null;
    return {
      version,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      saved_at: parsed.saved_at,
    };
  } catch {
    return null;
  }
}

function safeWriteConsent(consent) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // If storage is unavailable the site remains usable; the banner can be shown again later.
  }
}

function deleteCookie(name) {
  const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
  const host = location.hostname;
  const parts = host.split('.');
  const parent = parts.length >= 2 ? `.${parts.slice(-2).join('.')}` : null;
  document.cookie = `${name}=; expires=${expires}; path=/; SameSite=Lax`;
  document.cookie = `${name}=; expires=${expires}; path=/; domain=${host}; SameSite=Lax`;
  if (parent) document.cookie = `${name}=; expires=${expires}; path=/; domain=${parent}; SameSite=Lax`;
}

function clearKnownTrackingCookies() {
  const names = document.cookie.split(';').map(v => v.split('=')[0].trim()).filter(Boolean);
  for (const name of names) {
    if (/^(_ga|_gid|_gat|_gcl|_fbp|_fbc)/i.test(name)) deleteCookie(name);
  }
}

function ensureGtagQueue() {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
  }
}

function setGoogleConsent(consent) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('consent', 'update', {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.marketing ? 'granted' : 'denied',
    ad_user_data: consent.marketing ? 'granted' : 'denied',
    ad_personalization: consent.marketing ? 'granted' : 'denied',
  });
}

function loadGoogle(consent) {
  const analyticsId = consent.analytics ? trackingConfig.google_analytics_id : null;
  const adsId = consent.marketing ? trackingConfig.google_ads_id : null;
  if (!analyticsId && !adsId) {
    setGoogleConsent(consent);
    return;
  }

  ensureGtagQueue();
  if (!window.__econGoogleConsentDefaultSet) {
    window.gtag('consent', 'default', { ...deniedGoogleConsent, wait_for_update: 500 });
    window.__econGoogleConsentDefaultSet = true;
  }
  setGoogleConsent(consent);

  const primaryId = analyticsId || adsId;
  if (!document.querySelector('script[data-econ-google-tag]')) {
    const script = document.createElement('script');
    script.async = true;
    script.dataset.econGoogleTag = '1';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryId)}`;
    document.head.appendChild(script);
  }

  if (!window.__econGoogleJsInitialized) {
    window.gtag('js', new Date());
    window.__econGoogleJsInitialized = true;
  }
  window.__econGoogleConfigured = window.__econGoogleConfigured || new Set();
  if (analyticsId && !window.__econGoogleConfigured.has(analyticsId)) {
    window.gtag('config', analyticsId, { send_page_view: true });
    window.__econGoogleConfigured.add(analyticsId);
  }
  if (adsId && !window.__econGoogleConfigured.has(adsId)) {
    window.gtag('config', adsId);
    window.__econGoogleConfigured.add(adsId);
  }
}

function ensureFbq() {
  if (window.fbq) return window.fbq;
  const fbq = function () {
    if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
    else fbq.queue.push(arguments);
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  return fbq;
}

function loadMeta(consent) {
  if (!consent.marketing || !trackingConfig.meta_pixel_id) return;
  const fbq = ensureFbq();
  if (!document.querySelector('script[data-econ-meta-pixel]')) {
    const script = document.createElement('script');
    script.async = true;
    script.dataset.econMetaPixel = '1';
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
  if (!window.__econMetaInitialized) {
    fbq('init', trackingConfig.meta_pixel_id);
    fbq('track', 'PageView');
    window.__econMetaInitialized = true;
  }
}

function conversionAlreadySent(provider, leadId) {
  try {
    return sessionStorage.getItem(`econ_paid_conversion_v1:${provider}:${leadId}`) === '1';
  } catch {
    return false;
  }
}

function markConversionSent(provider, leadId) {
  try {
    sessionStorage.setItem(`econ_paid_conversion_v1:${provider}:${leadId}`, '1');
  } catch {
    // Provider-side event/transaction IDs still protect against duplicate conversion counting.
  }
}

function firePaidLeadConversion(rawLeadId) {
  const leadId = String(rawLeadId || '').trim();
  if (!leadId || currentConsent?.marketing !== true || !trackingConfig) {
    return { google_ads: false, meta_pixel: false, reason: 'marketing_consent_required' };
  }

  loadGoogle(currentConsent);
  loadMeta(currentConsent);

  let googleAds = false;
  let metaPixel = false;
  const adsId = trackingConfig.google_ads_id;
  const adsLabel = trackingConfig.google_ads_conversion_label;

  if (adsId && adsLabel && typeof window.gtag === 'function' && !conversionAlreadySent('google_ads', leadId)) {
    window.gtag('event', 'conversion', {
      send_to: `${adsId}/${adsLabel}`,
      transaction_id: leadId,
    });
    markConversionSent('google_ads', leadId);
    googleAds = true;
  }

  if (trackingConfig.meta_pixel_id && typeof window.fbq === 'function' && !conversionAlreadySent('meta_pixel', leadId)) {
    window.fbq('track', 'Lead', {}, { eventID: leadId });
    markConversionSent('meta_pixel', leadId);
    metaPixel = true;
  }

  return { google_ads: googleAds, meta_pixel: metaPixel };
}

function applyConsent(consent) {
  currentConsent = consent;
  loadGoogle(consent);
  loadMeta(consent);
  if (!consent.analytics && !consent.marketing) clearKnownTrackingCookies();
  if (!consent.analytics) {
    for (const name of document.cookie.split(';').map(v => v.split('=')[0].trim())) {
      if (/^(_ga|_gid|_gat)/i.test(name)) deleteCookie(name);
    }
  }
  if (!consent.marketing) {
    for (const name of document.cookie.split(';').map(v => v.split('=')[0].trim())) {
      if (/^(_gcl|_fbp|_fbc)/i.test(name)) deleteCookie(name);
    }
  }
}

function persistConsent({ analytics, marketing }) {
  const consent = {
    version: trackingConfig.consent_version || '2026-08-13',
    analytics: analytics === true,
    marketing: marketing === true,
    saved_at: Date.now(),
  };
  safeWriteConsent(consent);
  applyConsent(consent);
  return consent;
}

function buildUi(privacyUrl) {
  const layer = document.createElement('div');
  layer.id = 'econConsentLayer';
  layer.className = 'econ-consent-layer';
  layer.hidden = true;
  layer.innerHTML = `
    <section class="econ-consent-panel" role="dialog" aria-modal="true" aria-labelledby="econConsentTitle">
      <button type="button" class="econ-consent-close" id="econConsentClose" aria-label="Continua solo con strumenti necessari">×</button>
      <div class="econ-consent-kicker">Privacy e misurazione</div>
      <h2 id="econConsentTitle">Scegli quali strumenti attivare</h2>
      <p>Il test usa strumenti tecnici necessari al suo funzionamento. Solo con il tuo consenso possiamo attivare strumenti di analisi o pubblicitari di terze parti per misurare le campagne e, se previsto, personalizzare la pubblicità.</p>
      <div class="econ-consent-links">
        <a id="econConsentPrivacy" href="#" target="_blank" rel="noopener">Informativa privacy</a>
        <button type="button" class="econ-consent-link-button" id="econConsentOpenDetail">Dettagli e preferenze</button>
      </div>
      <div id="econConsentDetail" class="econ-consent-detail" hidden>
        <div class="econ-consent-row">
          <div><b>Necessari</b><span>Funzionamento del test, sicurezza e memorizzazione della tua scelta sui cookie. Sempre attivi.</span></div>
          <label class="econ-consent-toggle"><input type="checkbox" checked disabled> Attivi</label>
        </div>
        <div class="econ-consent-row" id="econAnalyticsRow">
          <div><b>Analitici</b><span>Google Analytics, se configurato, per misurare utilizzo e performance del sito.</span></div>
          <label class="econ-consent-toggle"><input id="econConsentAnalytics" type="checkbox"> Consenti</label>
        </div>
        <div class="econ-consent-row" id="econMarketingRow">
          <div><b>Marketing</b><span>Google Ads e Meta Pixel, se configurati, per misurazione pubblicitaria, attribuzione e remarketing.</span></div>
          <label class="econ-consent-toggle"><input id="econConsentMarketing" type="checkbox"> Consenti</label>
        </div>
        <div id="econConsentProviders" class="econ-consent-provider"></div>
        <div class="econ-consent-links">
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Privacy Google</a>
          <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener">Privacy Meta</a>
          <a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener">Preferenze pubblicitarie</a>
        </div>
        <button type="button" class="econ-consent-action econ-consent-save" id="econConsentSave">Salva preferenze</button>
      </div>
      <div class="econ-consent-actions">
        <button type="button" class="econ-consent-action" id="econConsentReject">Rifiuta non necessari</button>
        <button type="button" class="econ-consent-action" id="econConsentCustomize">Personalizza</button>
        <button type="button" class="econ-consent-action" id="econConsentAccept">Accetta tutti</button>
      </div>
    </section>`;

  const settings = document.createElement('button');
  settings.id = 'econConsentSettings';
  settings.type = 'button';
  settings.className = 'econ-consent-settings';
  settings.textContent = 'Scelte cookie';
  settings.hidden = true;
  settings.setAttribute('aria-label', 'Rivedi le tue scelte sui cookie');

  document.body.append(layer, settings);
  const privacy = layer.querySelector('#econConsentPrivacy');
  if (privacyUrl) privacy.href = privacyUrl;
  else privacy.hidden = true;
  return { layer, settings };
}

function configureUi(ui) {
  const { layer, settings } = ui;
  const analyticsRow = layer.querySelector('#econAnalyticsRow');
  const marketingRow = layer.querySelector('#econMarketingRow');
  const analyticsToggle = layer.querySelector('#econConsentAnalytics');
  const marketingToggle = layer.querySelector('#econConsentMarketing');
  const detail = layer.querySelector('#econConsentDetail');
  const providers = layer.querySelector('#econConsentProviders');
  const hasAnalytics = Boolean(trackingConfig.google_analytics_id);
  const hasMarketing = Boolean(trackingConfig.google_ads_id || trackingConfig.meta_pixel_id);

  analyticsRow.hidden = !hasAnalytics;
  marketingRow.hidden = !hasMarketing;
  const providerNames = [];
  if (trackingConfig.google_analytics_id) providerNames.push('Google Analytics');
  if (trackingConfig.google_ads_id) providerNames.push('Google Ads');
  if (trackingConfig.meta_pixel_id) providerNames.push('Meta Pixel');
  providers.innerHTML = `<b>Terze parti configurate:</b> ${providerNames.join(', ')}. Gli strumenti non necessari restano bloccati finché non esprimi una scelta positiva.`;

  const openDetail = () => {
    detail.hidden = false;
    analyticsToggle.checked = Boolean(currentConsent?.analytics && hasAnalytics);
    marketingToggle.checked = Boolean(currentConsent?.marketing && hasMarketing);
    layer.querySelector('#econConsentSave').focus();
  };
  const closeAsDenied = () => {
    currentConsent = persistConsent({ analytics: false, marketing: false });
    layer.hidden = true;
    settings.hidden = false;
  };
  const acceptAll = () => {
    currentConsent = persistConsent({ analytics: hasAnalytics, marketing: hasMarketing });
    layer.hidden = true;
    settings.hidden = false;
  };
  const saveDetail = () => {
    currentConsent = persistConsent({
      analytics: hasAnalytics && analyticsToggle.checked,
      marketing: hasMarketing && marketingToggle.checked,
    });
    layer.hidden = true;
    settings.hidden = false;
  };

  layer.querySelector('#econConsentClose').addEventListener('click', closeAsDenied);
  layer.querySelector('#econConsentReject').addEventListener('click', closeAsDenied);
  layer.querySelector('#econConsentAccept').addEventListener('click', acceptAll);
  layer.querySelector('#econConsentCustomize').addEventListener('click', openDetail);
  layer.querySelector('#econConsentOpenDetail').addEventListener('click', openDetail);
  layer.querySelector('#econConsentSave').addEventListener('click', saveDetail);
  settings.addEventListener('click', () => {
    layer.hidden = false;
    detail.hidden = false;
    analyticsToggle.checked = Boolean(currentConsent?.analytics && hasAnalytics);
    marketingToggle.checked = Boolean(currentConsent?.marketing && hasMarketing);
    layer.querySelector('#econConsentClose').focus();
  });
}

async function initConsentManager() {
  let cfg;
  try {
    const response = await fetch('/api/config', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) return;
    cfg = await response.json();
  } catch {
    return;
  }

  trackingConfig = cfg?.tracking || null;
  if (!trackingConfig?.configured) return;

  const ui = buildUi(cfg?.privacy_url || null);
  configureUi(ui);
  const version = trackingConfig.consent_version || '2026-08-13';
  currentConsent = safeReadConsent(version);
  if (currentConsent) {
    applyConsent(currentConsent);
    ui.settings.hidden = false;
  } else {
    ui.layer.hidden = false;
    ui.layer.querySelector('#econConsentClose').focus();
  }

  window.ECONTrackingConsent = {
    get: () => ({ ...(currentConsent || { analytics: false, marketing: false }) }),
    analyticsAllowed: () => currentConsent?.analytics === true,
    marketingAllowed: () => currentConsent?.marketing === true,
    fireLeadConversion: firePaidLeadConversion,
    openSettings: () => ui.settings.click(),
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initConsentManager, { once: true });
} else {
  initConsentManager();
}
