// Generic GBFS (General Bikeshare Feed Specification) provider: works with any
// operator that publishes a GBFS feed AND allows browser requests (CORS).
// Supports GBFS 2.x (free_bike_status) and 3.x (vehicle_status). For feeds
// without CORS, use the Home Assistant sensor route instead
// (see homeassistant/packages/scooter_map_gbfs.yaml).
//
// source:
//   provider: gbfs
//   url: https://example.com/gbfs/gbfs.json     # auto-discovery file, or the
//                                               # vehicle_status / free_bike_status URL directly
//   lat: 52.52        # centre + radius filter (the feed is city-wide)
//   lon: 13.40
//   range_m: 800
//   language: en      # GBFS 2.x discovery files are keyed by language
//   max_range_m: 50000  # fallback when neither fuel percent nor the vehicle type's max range is published
//   include_reserved: false
//   include_disabled: false
//   operator: Lime    # label for the pop-up, since a feed has no operator name per vehicle

const discovery = new Map(); // url -> { at, feeds }

async function getJson(url) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

async function discover(url, lang) {
  const cached = discovery.get(url);
  if (cached && Date.now() - cached.at < 3600e3) return cached.feeds;
  const j = await getJson(url);
  let feeds = [];
  if (j.data && Array.isArray(j.data.feeds)) feeds = j.data.feeds; // GBFS 3.x
  else if (j.data && typeof j.data === "object") {
    // GBFS 2.x: { data: { en: { feeds: [...] }, nb: {...} } }
    const langs = Object.keys(j.data);
    const pick = (lang && j.data[lang]) || j.data[langs[0]];
    feeds = (pick && pick.feeds) || [];
  }
  const map = {};
  for (const f of feeds) map[f.name] = f.url;
  discovery.set(url, { at: Date.now(), feeds: map });
  return map;
}

export default {
  id: "gbfs",
  async fetch(src) {
    if (!src.url) throw new Error("source.url is required for the gbfs provider");
    let statusUrl = src.url, typesUrl = null;
    if (/gbfs(\.json)?$/i.test(src.url) || /\/gbfs\/?$/i.test(src.url)) {
      const feeds = await discover(src.url, src.language);
      statusUrl = feeds.vehicle_status || feeds.free_bike_status;
      typesUrl = feeds.vehicle_types || null;
      if (!statusUrl) throw new Error("feed has no vehicle_status / free_bike_status");
    } else if (src.vehicle_types_url) {
      typesUrl = src.vehicle_types_url;
    }
    const [status, types] = await Promise.all([getJson(statusUrl), typesUrl ? getJson(typesUrl).catch(() => null) : null]);
    const vt = {};
    for (const t of (types && types.data && types.data.vehicle_types) || []) vt[t.vehicle_type_id] = t;
    const list = (status.data && (status.data.vehicles || status.data.bikes)) || [];
    const out = [];
    for (const v of list) {
      if (v.lat == null || v.lon == null) continue;
      if (v.is_disabled && !src.include_disabled) continue;
      if (v.is_reserved && !src.include_reserved) continue;
      const t = vt[v.vehicle_type_id] || {};
      const fuel = v.current_fuel_percent != null ? Number(v.current_fuel_percent) : null;
      out.push({
        id: v.vehicle_id || v.bike_id,
        lat: Number(v.lat),
        lon: Number(v.lon),
        range_m: v.current_range_meters != null ? Number(v.current_range_meters) : null,
        fuel_pct: fuel != null ? (fuel <= 1 ? fuel * 100 : fuel) : null,
        max_range_m: t.max_range_meters != null ? Number(t.max_range_meters) : null,
        form_factor: t.form_factor ? String(t.form_factor).toUpperCase() : null,
        propulsion: t.propulsion_type ? String(t.propulsion_type).toUpperCase() : null,
        operator_id: src.operator || null,
        operator: src.operator || null,
        url_android: v.rental_uris ? v.rental_uris.android : null,
        url_ios: v.rental_uris ? v.rental_uris.ios : null,
        url_web: v.rental_uris ? v.rental_uris.web : null,
      });
    }
    return out;
  },
};
