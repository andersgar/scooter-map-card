// UI strings. Pick with `language:` in the card config; otherwise the Home
// Assistant user language is used, falling back to English.
export const STR = {
  en: {
    title: "Scooters",
    home: "home",
    within: (n, r) => `<b>${n}</b> within ${r} m`,
    nearest: (d) => `nearest <b>${d} m</b>`,
    none: "No vehicles nearby",
    no_data: (e) => `No data from ${e}`,
    loading: "Loading vehicles…",
    error: (m) => `Could not load vehicles: ${m}`,
    offline: "offline",
    range: (km) => `≈ ${km} km range`,
    from: (d, where) => `${d} m from ${where}`,
    open_in: (op) => `Open in the ${op} app`,
    center: "Center on home",
    battery: "battery",
  },
  nb: {
    title: "Sparkesykler",
    home: "hjem",
    within: (n, r) => `<b>${n}</b> innen ${r} m`,
    nearest: (d) => `nærmeste <b>${d} m</b>`,
    none: "Ingen kjøretøy i nærheten",
    no_data: (e) => `Ingen data fra ${e}`,
    loading: "Henter kjøretøy…",
    error: (m) => `Kunne ikke hente kjøretøy: ${m}`,
    offline: "frakoblet",
    range: (km) => `≈ ${km} km rekkevidde`,
    from: (d, where) => `${d} m fra ${where}`,
    open_in: (op) => `Åpne i ${op}-appen`,
    center: "Sentrer",
    battery: "batteri",
  },
  sv: {
    title: "Elsparkcyklar",
    home: "hem",
    within: (n, r) => `<b>${n}</b> inom ${r} m`,
    nearest: (d) => `närmaste <b>${d} m</b>`,
    none: "Inga fordon i närheten",
    no_data: (e) => `Inga data från ${e}`,
    loading: "Hämtar fordon…",
    error: (m) => `Kunde inte hämta fordon: ${m}`,
    offline: "frånkopplad",
    range: (km) => `≈ ${km} km räckvidd`,
    from: (d, where) => `${d} m från ${where}`,
    open_in: (op) => `Öppna i ${op}-appen`,
    center: "Centrera",
    battery: "batteri",
  },
  de: {
    title: "E-Scooter",
    home: "Zuhause",
    within: (n, r) => `<b>${n}</b> im Umkreis von ${r} m`,
    nearest: (d) => `nächster <b>${d} m</b>`,
    none: "Keine Fahrzeuge in der Nähe",
    no_data: (e) => `Keine Daten von ${e}`,
    loading: "Fahrzeuge werden geladen…",
    error: (m) => `Fahrzeuge konnten nicht geladen werden: ${m}`,
    offline: "offline",
    range: (km) => `≈ ${km} km Reichweite`,
    from: (d, where) => `${d} m von ${where}`,
    open_in: (op) => `In der ${op}-App öffnen`,
    center: "Zentrieren",
    battery: "Akku",
  },
};
STR.no = STR.nb;
STR.nn = STR.nb;

export function pickLanguage(configLang, hass) {
  const cands = [configLang, hass && hass.locale && hass.locale.language, hass && hass.language, typeof navigator !== "undefined" ? navigator.language : null];
  for (const c of cands) {
    if (!c) continue;
    const l = String(c).toLowerCase();
    if (STR[l]) return STR[l];
    const short = l.split(/[-_]/)[0];
    if (STR[short]) return STR[short];
  }
  return STR.en;
}

// Labels for the visual editor (falls back to English).
export const EDITOR = {
  en: {
    section_data: "Data", section_display: "Appearance", section_advanced: "Advanced",
    mode_entity: "Home Assistant entity", mode_source: "Fetch from provider",
    advanced_help: "Operator colours and names are maps of operator id or keyword to value; edit them as YAML here.",
    auto: "Automatic", yes: "Yes", no: "No", marker_battery: "By battery", marker_operator: "By operator",
    labels: {
      entity: "Sensor with a `list` attribute", provider: "Provider", refresh: "Refresh interval", url: "API or feed URL (empty = Entur)",
      lat: "Latitude (empty = Home Assistant home)", lon: "Longitude", range_m: "Radius", count: "Max vehicles fetched",
      operators: "Operators (empty = all)", form_factors: "Vehicle types (empty = all)", operator: "Operator label", max_range_m: "Fallback max range",
      include_reserved: "Include reserved", include_disabled: "Include disabled",
      title: "Title", language: "Language", zoom: "Zoom", max_markers: "Markers shown", marker_color: "Marker colour", tiles: "Map tiles",
      link: "App link in pop-up", show_legend: "Operator legend", show_title: "Show title", show_stats: "Show counts", show_controls: "Show zoom buttons",
      show_attribution: "Show map credit", show_home: "Show home pin", interactive: "Interactive map", tap_action: "Tap action",
      stats_radii: "Count radii (m, comma separated)", brightness: "Tile brightness", height: "Minimum height (px or CSS)", home_label: "Home label",
      home_lat: "Home latitude override", home_lon: "Home longitude override", tile_url: "Custom tile URL", tile_attribution: "Tile attribution", tile_filter: "Tile CSS filter",
      operator_colors: "Operator colours", operator_names: "Operator names",
    },
    helpers: {
      url: "Entur-style GraphQL endpoint (e.g. MobiData BW) or a GBFS gbfs.json / vehicle_status URL.",
      operators: "Entur ids such as YRY:Operator:Ryde; type your own for other Lamassu instances.",
      show_legend: "Automatic = shown when colouring by operator.",
    },
  },
  nb: {
    section_data: "Data", section_display: "Utseende", section_advanced: "Avansert",
    mode_entity: "Home Assistant-entitet", mode_source: "Hent fra leverandør",
    advanced_help: "Operatørfarger og -navn er oppslag fra operatør-id eller nøkkelord til verdi; rediger dem som YAML her.",
    auto: "Automatisk", yes: "Ja", no: "Nei", marker_battery: "Etter batteri", marker_operator: "Etter operatør",
    labels: {
      entity: "Sensor med `list`-attributt", provider: "Leverandør", refresh: "Oppdateringsintervall", url: "API- eller feed-URL (tom = Entur)",
      lat: "Breddegrad (tom = hjem i Home Assistant)", lon: "Lengdegrad", range_m: "Radius", count: "Maks kjøretøy hentet",
      operators: "Operatører (tom = alle)", form_factors: "Kjøretøytyper (tom = alle)", operator: "Operatørnavn", max_range_m: "Standard maks rekkevidde",
      include_reserved: "Ta med reserverte", include_disabled: "Ta med deaktiverte",
      title: "Tittel", language: "Språk", zoom: "Zoom", max_markers: "Markører som vises", marker_color: "Markørfarge", tiles: "Kartfliser",
      link: "App-lenke i popup", show_legend: "Operatørforklaring", show_title: "Vis tittel", show_stats: "Vis antall", show_controls: "Vis zoomknapper",
      show_attribution: "Vis kartkreditering", show_home: "Vis hjem-nål", interactive: "Interaktivt kart", tap_action: "Trykkhandling",
      stats_radii: "Radier for antall (m, kommaseparert)", brightness: "Lysstyrke på fliser", height: "Minimumshøyde (px eller CSS)", home_label: "Hjem-etikett",
      home_lat: "Overstyr hjem breddegrad", home_lon: "Overstyr hjem lengdegrad", tile_url: "Egen flis-URL", tile_attribution: "Flis-kreditering", tile_filter: "CSS-filter på fliser",
      operator_colors: "Operatørfarger", operator_names: "Operatørnavn",
    },
    helpers: {
      url: "GraphQL-endepunkt à la Entur (f.eks. MobiData BW) eller en GBFS gbfs.json / vehicle_status-URL.",
      operators: "Entur-id-er som YRY:Operator:Ryde; skriv egne for andre Lamassu-instanser.",
      show_legend: "Automatisk = vises når markørene farges etter operatør.",
    },
  },
};
EDITOR.no = EDITOR.nb;
EDITOR.nn = EDITOR.nb;

export function pickEditorLanguage(hass) {
  const l = String((hass && hass.locale && hass.locale.language) || (hass && hass.language) || "en").toLowerCase();
  return EDITOR[l] || EDITOR[l.split(/[-_]/)[0]] || EDITOR.en;
}
