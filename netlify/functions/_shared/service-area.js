import { env } from "./env.js";

export const SERVICE_AREA_VERSION = "econ.service-area.v1";

const DEFAULT_TARGET_REGIONS = new Set([
  "emilia-romagna",
  "friuli-venezia-giulia",
  "liguria",
  "lombardia",
  "piemonte",
  "trentino-alto-adige",
  "valle-d-aosta",
]);

const PROVINCE_TO_REGION = Object.freeze({
  AQ:"abruzzo", CH:"abruzzo", PE:"abruzzo", TE:"abruzzo",
  MT:"basilicata", PZ:"basilicata",
  CZ:"calabria", CS:"calabria", KR:"calabria", RC:"calabria", VV:"calabria",
  AV:"campania", BN:"campania", CE:"campania", NA:"campania", SA:"campania",
  BO:"emilia-romagna", FE:"emilia-romagna", FC:"emilia-romagna", MO:"emilia-romagna", PR:"emilia-romagna", PC:"emilia-romagna", RA:"emilia-romagna", RE:"emilia-romagna", RN:"emilia-romagna",
  GO:"friuli-venezia-giulia", PN:"friuli-venezia-giulia", TS:"friuli-venezia-giulia", UD:"friuli-venezia-giulia",
  FR:"lazio", LT:"lazio", RI:"lazio", RM:"lazio", VT:"lazio",
  GE:"liguria", IM:"liguria", SP:"liguria", SV:"liguria",
  BG:"lombardia", BS:"lombardia", CO:"lombardia", CR:"lombardia", LC:"lombardia", LO:"lombardia", MN:"lombardia", MI:"lombardia", MB:"lombardia", PV:"lombardia", SO:"lombardia", VA:"lombardia",
  AN:"marche", AP:"marche", FM:"marche", MC:"marche", PU:"marche",
  CB:"molise", IS:"molise",
  AL:"piemonte", AT:"piemonte", BI:"piemonte", CN:"piemonte", NO:"piemonte", TO:"piemonte", VB:"piemonte", VC:"piemonte",
  BA:"puglia", BT:"puglia", BR:"puglia", FG:"puglia", LE:"puglia", TA:"puglia",
  CA:"sardegna", NU:"sardegna", OR:"sardegna", SS:"sardegna", SU:"sardegna",
  AG:"sicilia", CL:"sicilia", CT:"sicilia", EN:"sicilia", ME:"sicilia", PA:"sicilia", RG:"sicilia", SR:"sicilia", TP:"sicilia",
  AR:"toscana", FI:"toscana", GR:"toscana", LI:"toscana", LU:"toscana", MS:"toscana", PI:"toscana", PO:"toscana", PT:"toscana", SI:"toscana",
  BZ:"trentino-alto-adige", TN:"trentino-alto-adige",
  PG:"umbria", TR:"umbria",
  AO:"valle-d-aosta",
  BL:"veneto", PD:"veneto", RO:"veneto", TV:"veneto", VE:"veneto", VR:"veneto", VI:"veneto",
});

const PROVINCE_ALIASES = new Map(Object.entries({
  "l-aquila":"AQ", aquila:"AQ", chieti:"CH", pescara:"PE", teramo:"TE",
  matera:"MT", potenza:"PZ",
  catanzaro:"CZ", cosenza:"CS", crotone:"KR", "reggio-calabria":"RC", "vibo-valentia":"VV",
  avellino:"AV", benevento:"BN", caserta:"CE", napoli:"NA", salerno:"SA",
  bologna:"BO", ferrara:"FE", "forli-cesena":"FC", forli:"FC", cesena:"FC", modena:"MO", parma:"PR", piacenza:"PC", ravenna:"RA", "reggio-emilia":"RE", rimini:"RN",
  gorizia:"GO", pordenone:"PN", trieste:"TS", udine:"UD",
  frosinone:"FR", latina:"LT", rieti:"RI", roma:"RM", viterbo:"VT",
  genova:"GE", imperia:"IM", "la-spezia":"SP", savona:"SV",
  bergamo:"BG", brescia:"BS", como:"CO", cremona:"CR", lecco:"LC", lodi:"LO", mantova:"MN", milano:"MI", "monza-brianza":"MB", "monza-e-brianza":"MB", monza:"MB", pavia:"PV", sondrio:"SO", varese:"VA",
  ancona:"AN", "ascoli-piceno":"AP", fermo:"FM", macerata:"MC", "pesaro-urbino":"PU", "pesaro-e-urbino":"PU",
  campobasso:"CB", isernia:"IS",
  alessandria:"AL", asti:"AT", biella:"BI", cuneo:"CN", novara:"NO", torino:"TO", "verbano-cusio-ossola":"VB", vercelli:"VC",
  bari:"BA", "barletta-andria-trani":"BT", brindisi:"BR", foggia:"FG", lecce:"LE", taranto:"TA",
  cagliari:"CA", nuoro:"NU", oristano:"OR", sassari:"SS", "sud-sardegna":"SU",
  agrigento:"AG", caltanissetta:"CL", catania:"CT", enna:"EN", messina:"ME", palermo:"PA", ragusa:"RG", siracusa:"SR", trapani:"TP",
  arezzo:"AR", firenze:"FI", grosseto:"GR", livorno:"LI", lucca:"LU", "massa-carrara":"MS", pisa:"PI", prato:"PO", pistoia:"PT", siena:"SI",
  bolzano:"BZ", bozen:"BZ", trento:"TN",
  perugia:"PG", terni:"TR",
  aosta:"AO", "valle-d-aosta":"AO",
  belluno:"BL", padova:"PD", rovigo:"RO", treviso:"TV", venezia:"VE", verona:"VR", vicenza:"VI",
}));

function slug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizedRegion(value) {
  const s = slug(value);
  if (!s) return "";
  const aliases = {
    "friuli-venezia-giulia":"friuli-venezia-giulia",
    "friuli-venezia-giulia-fvg":"friuli-venezia-giulia",
    "trentino-alto-adige-sudtirol":"trentino-alto-adige",
    "trentino-alto-adige":"trentino-alto-adige",
    "valle-d-aosta":"valle-d-aosta",
    "valle-d-aosta-vallee-d-aoste":"valle-d-aosta",
    "emilia-romagna":"emilia-romagna",
  };
  return aliases[s] || s;
}

function configuredRegionSet() {
  const raw = env("ECON_SERVICE_AREA_REGIONS", "").trim();
  if (!raw) return new Set(DEFAULT_TARGET_REGIONS);
  const values = raw.split(",").map(normalizedRegion).filter(Boolean);
  return values.length ? new Set(values) : new Set(DEFAULT_TARGET_REGIONS);
}

function configuredProvinceSet() {
  const raw = env("ECON_SERVICE_AREA_PROVINCES", "").trim();
  if (!raw) return null;
  const values = raw.split(",").map(value => provinceCodeFromValue(value)).filter(Boolean);
  return values.length ? new Set(values) : null;
}

export function provinceCodeFromValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const direct = raw.toUpperCase().replace(/[^A-Z]/g, "");
  if (direct.length === 2 && PROVINCE_TO_REGION[direct]) return direct;

  const prefix = raw.match(/^\s*([A-Za-z]{2})\b/);
  if (prefix) {
    const code = prefix[1].toUpperCase();
    if (PROVINCE_TO_REGION[code]) return code;
  }

  let key = slug(raw)
    .replace(/^provincia-(?:di|del|della|dell)-/, "")
    .replace(/^citta-metropolitana-(?:di|del|della|dell)-/, "");
  if (PROVINCE_ALIASES.has(key)) return PROVINCE_ALIASES.get(key);
  if (key.startsWith("provincia-")) key = key.slice("provincia-".length);
  return PROVINCE_ALIASES.get(key) || "";
}

function provinceFromAddress(address) {
  const raw = String(address || "").trim();
  if (!raw) return "";
  const tail = raw.match(/(?:\s|,|\()([A-Za-z]{2})\)?\s*$/);
  if (tail) {
    const code = tail[1].toUpperCase();
    if (PROVINCE_TO_REGION[code]) return code;
  }
  return "";
}

export function classifyServiceArea(property = {}) {
  const provinceCode = provinceCodeFromValue(property?.province) || provinceFromAddress(property?.address);
  const region = provinceCode ? PROVINCE_TO_REGION[provinceCode] || "" : normalizedRegion(property?.region);
  const provinceOverride = configuredProvinceSet();
  const regionSet = configuredRegionSet();

  let status = "UNKNOWN";
  let reason = "province_unresolved";
  if (provinceCode && PROVINCE_TO_REGION[provinceCode]) {
    const included = provinceOverride ? provinceOverride.has(provinceCode) : regionSet.has(region);
    status = included ? "IN_AREA" : "OUT_OF_AREA";
    reason = provinceOverride ? (included ? "province_included" : "province_excluded") : (included ? "region_included" : "region_excluded");
  } else if (region) {
    const included = !provinceOverride && regionSet.has(region);
    status = included ? "IN_AREA" : "OUT_OF_AREA";
    reason = included ? "region_included_without_province" : "region_excluded_without_province";
  }

  return {
    schema: SERVICE_AREA_VERSION,
    status,
    tier: status === "IN_AREA" ? "TARGET" : status === "OUT_OF_AREA" ? "OUT_OF_AREA" : "UNKNOWN",
    province_code: provinceCode || null,
    region: region || null,
    meta_lead_eligible: status === "IN_AREA",
    reason,
  };
}

export function serviceAreaConfigSummary() {
  const provinceOverride = configuredProvinceSet();
  const regions = configuredRegionSet();
  return {
    version: SERVICE_AREA_VERSION,
    mode: provinceOverride ? "province" : "region",
    regions: provinceOverride ? [] : [...regions].sort(),
    provinces: provinceOverride ? [...provinceOverride].sort() : [],
    meta_lead_definition: "new_persisted_lead+in_area",
    qualified_lead_definition: "in_area+commercial_fv_request",
  };
}

export function classifyLeadQuality(body = {}) {
  const serviceArea = classifyServiceArea(body?.property || {});
  const commercial = body?.contact?.commercial_fv_request === true;
  return {
    service_area: serviceArea,
    meta_lead_eligible: serviceArea.meta_lead_eligible,
    qualified_lead_eligible: serviceArea.meta_lead_eligible && commercial,
    commercial_fv_request: commercial,
  };
}

export const __test = {
  DEFAULT_TARGET_REGIONS,
  PROVINCE_TO_REGION,
  slug,
  normalizedRegion,
  provinceFromAddress,
};
