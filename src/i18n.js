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
