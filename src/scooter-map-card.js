/*
 * scooter-map-card — Home Assistant custom card: shared e-scooters / bikes
 * near home on a dark Leaflet map, each marker labelled with its battery.
 *
 * Data comes from one of two places:
 *   entity: sensor.ryde_list        a Home Assistant entity whose `list`
 *                                   attribute holds vehicles
 *                                   (see docs/home-assistant-sensors.md)
 *   source: { provider: entur, operators: [...] }
 *                                   the card fetches vehicles itself
 *                                   (see docs/providers.md)
 *
 * List entry shape (both modes), sorted by distance:
 *   {id, lat, lon, d (m), bat (0-100 | null), km, url_android, url_ios,
 *    url_web?, operator?, operator_id?, form_factor?}
 */
import * as L from "leaflet";
import leafletCss from "leaflet/dist/leaflet.css";
import { pickLanguage } from "./i18n.js";
import { getProvider } from "./providers/index.js";
import { subscribe } from "./poller.js";

// eslint-disable-next-line no-undef
const VERSION = typeof __VERSION__ === "string" ? __VERSION__ : "dev";

const ICON_SCOOTER =
  "M7.82 16H15V15C15 12.79 16.79 11 19 11H19.74L17.84 2.56C17.63 1.65 16.82 1 15.89 1H12V3H15.89L17.29 9.25H17.28C15.12 9.9 13.47 11.73 13.09 14H7.82C7.34 12.66 5.96 11.76 4.4 12.06C3.22 12.29 2.27 13.26 2.05 14.44C1.7 16.34 3.16 18 5 18C6.3 18 7.4 17.16 7.82 16M5 16C4.45 16 4 15.55 4 15S4.45 14 5 14 6 14.45 6 15 5.55 16 5 16M19 12C17.34 12 16 13.34 16 15S17.34 18 19 18 22 16.66 22 15 20.66 12 19 12M19 16C18.45 16 18 15.55 18 15S18.45 14 19 14 20 14.45 20 15 19.55 16 19 16M11 20H7L13 23V21H17L11 18V20Z";
const ICON_BIKE =
  "M5,20.5A3.5,3.5 0 0,1 1.5,17A3.5,3.5 0 0,1 5,13.5A3.5,3.5 0 0,1 8.5,17A3.5,3.5 0 0,1 5,20.5M5,12A5,5 0 0,0 0,17A5,5 0 0,0 5,22A5,5 0 0,0 10,17A5,5 0 0,0 5,12M14.8,10H19V8.2H15.8L13.86,4.93C13.57,4.43 13,4.1 12.4,4.1C11.93,4.1 11.5,4.29 11.2,4.6L7.5,8.29C7.19,8.6 7,9 7,9.5C7,10.13 7.33,10.66 7.85,10.97L11.2,13V18H13V11.5L10.75,9.85L13.07,7.5M19,20.5A3.5,3.5 0 0,1 15.5,17A3.5,3.5 0 0,1 19,13.5A3.5,3.5 0 0,1 22.5,17A3.5,3.5 0 0,1 19,20.5M19,12A5,5 0 0,0 14,17A5,5 0 0,0 19,22A5,5 0 0,0 24,17A5,5 0 0,0 19,12M16,4.8C17,4.8 17.8,4 17.8,3C17.8,2 17,1.2 16,1.2C15,1.2 14.2,2 14.2,3C14.2,4 15,4.8 16,4.8Z";
const ICON_CAR =
  "M5,11L6.5,6.5H17.5L19,11M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M18.92,6C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6Z";
const ICON_HOME = "M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z";
const ICON_CENTER =
  "M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M3.05,13H1V11H3.05C3.5,6.83 6.83,3.5 11,3.05V1H13V3.05C17.17,3.5 20.5,6.83 20.95,11H23V13H20.95C20.5,17.17 17.17,20.5 13,20.95V23H11V20.95C6.83,20.5 3.5,17.17 3.05,13M12,5A7,7 0 0,0 5,12A7,7 0 0,0 12,19A7,7 0 0,0 19,12A7,7 0 0,0 12,5Z";

const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const iconFor = (ff) => {
  const f = String(ff || "").toUpperCase();
  if (f.startsWith("BICYCLE") || f === "CARGO_BICYCLE") return ICON_BIKE;
  if (f === "CAR") return ICON_CAR;
  return ICON_SCOOTER;
};

// Key-free tile sources. "dark" is OpenStreetMap run through the same kind of
// CSS filter Home Assistant's own map card uses for dark mode. Kartverket is
// Norway only (and free); "auto" picks it when the map centre is in Norway.
const OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const KV = (layer) => `https://cache.kartverket.no/v1/wmts/1.0.0/${layer}/default/webmercator/{z}/{y}/{x}.png`;
const DARK_FILTER = "brightness(0.65) invert(1) contrast(3) hue-rotate(200deg) saturate(0.35) brightness(0.6)";
const TILES = {
  dark: { url: OSM, attribution: "&copy; OpenStreetMap contributors", filter: DARK_FILTER },
  light: { url: OSM, attribution: "&copy; OpenStreetMap contributors", filter: "" },
  osm: { url: OSM, attribution: "&copy; OpenStreetMap contributors", filter: "" },
  "kartverket-dark": { url: KV("topo"), attribution: "&copy; Kartverket", filter: DARK_FILTER },
  "kartverket-invert": { url: KV("topograatone"), attribution: "&copy; Kartverket", filter: "invert(1) brightness(0.8) contrast(1.15)" },
  kartverket: { url: KV("topograatone"), attribution: "&copy; Kartverket", filter: "" },
  "kartverket-topo": { url: KV("topo"), attribution: "&copy; Kartverket", filter: "" },
};
const inNorway = (c) => c && c[0] > 57.5 && c[0] < 71.5 && c[1] > 4 && c[1] < 31.5;

const batteryColor = (b) => (b == null ? "#9ca3af" : b >= 60 ? "#4ade80" : b >= 30 ? "#fbbf24" : "#f87171");

// Short display names for operator ids seen in Entur's feed; override with `operator_names`.
const OPERATOR_NAMES = {
  "YRY:Operator:Ryde": "Ryde", "YVO:Operator:voi": "Voi", "YDT:Operator:dott": "Dott", "YBO:Operator:bolt": "Bolt",
  "YOS:Operator:oslobysykkel": "Oslo Bysykkel", "YBE:Operator:bergenbysykkel": "Bergen Bysykkel",
  "YTR:Operator:trondheimbysykkel": "Trondheim Bysykkel", "YKO:Operator:kolumbusbysykkel": "Kolumbus Bysykkel",
};
// Brand-ish colours for `marker_color: operator`, matched on a keyword in the
// operator id or name (so "YVO:Operator:voi", "VOI:Operator:voi" and "Voi" all
// hit). Override or extend with `operator_colors`.
const OPERATOR_COLORS = [
  ["ryde", "#22c55e"], ["voi", "#f97316"], ["dott", "#14b8a6"], ["tier", "#14b8a6"], ["bolt", "#34d186"],
  ["lime", "#a3e635"], ["bird", "#38bdf8"], ["nextbike", "#0ea5e9"], ["bysykkel", "#60a5fa"], ["donkey", "#f59e0b"],
  ["zeus", "#e879f9"], ["hertz", "#facc15"], ["getaround", "#a78bfa"], ["hyre", "#fb7185"], ["otto", "#c084fc"],
];
const OP_PALETTE = ["#f97316", "#22c55e", "#38bdf8", "#e879f9", "#facc15", "#a78bfa", "#fb7185", "#14b8a6"];
const hashColor = (s) => {
  let h = 7;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return OP_PALETTE[h % OP_PALETTE.length];
};

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000, k = Math.PI / 180;
  const dp = (lat2 - lat1) * k, dl = (lon2 - lon1) * k;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(lat1 * k) * Math.cos(lat2 * k) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const STYLE = `
  :host { display: block; height: 100%; }
  ha-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    /* Own stacking context: Leaflet's z-index 400–1000 panes must not float
       above dashboard chrome such as a bottom navbar. */
    isolation: isolate;
    z-index: 0;
    background: var(--ha-card-background, var(--card-background-color, #1c1c1c));
  }
  .wrap { position: relative; flex: 1 1 auto; min-height: var(--rm-min-height, 260px); }
  #map { position: absolute; inset: 0; background: #0f1115; font-family: inherit; }
  .leaflet-container { font: inherit; }

  .hud {
    position: absolute; top: 10px; left: 10px; right: 10px; z-index: 800;
    display: flex; gap: 6px; align-items: flex-start; flex-wrap: wrap;
    pointer-events: none;
  }
  .chip {
    display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; max-width: 100%;
    padding: 5px 10px; border-radius: 999px;
    background: rgba(17, 17, 17, 0.82);
    border: 1px solid rgba(255,255,255,0.08);
    color: #e5e7eb; font-size: 12px; font-weight: 500; letter-spacing: .01em;
    box-shadow: 0 2px 8px rgba(0,0,0,.35);
  }
  .chip svg { width: 15px; height: 15px; fill: currentColor; opacity: .85; }
  .chip.title { font-weight: 600; font-size: 13px; }
  .chip.warn { color: #fbbf24; }
  .chip span { white-space: nowrap; }
  .chip .sep { opacity: .5; }
  .chip b { color: #fff; font-weight: 600; }
  .chip.legend { gap: 10px; }
  .chip.legend[hidden] { display: none; }
  .chip .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; vertical-align: -1px; border: 1px solid rgba(255,255,255,.5); }

  .btn {
    position: absolute; z-index: 800; width: 34px; height: 34px; border-radius: 10px;
    background: rgba(17,17,17,0.85); border: 1px solid rgba(255,255,255,0.1);
    color: #e5e7eb; display: grid; place-items: center; cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,.35);
  }
  .btn:hover { background: rgba(40,40,40,0.95); }
  .btn svg { width: 18px; height: 18px; fill: currentColor; }
  .btn.center { bottom: 96px; right: 10px; }

  .leaflet-control-zoom { border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 10px !important; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.35) !important; }
  .leaflet-control-zoom a {
    background: rgba(17,17,17,0.85) !important; color: #e5e7eb !important;
    border-bottom: 1px solid rgba(255,255,255,0.08) !important; width: 34px !important; height: 34px !important; line-height: 34px !important;
  }
  .leaflet-control-zoom a:hover { background: rgba(40,40,40,0.95) !important; }
  .leaflet-control-attribution {
    background: rgba(17,17,17,0.6) !important; color: #9ca3af !important; font-size: 9px !important; padding: 1px 5px !important;
  }
  .leaflet-control-attribution a { color: #9ca3af !important; }

  .rm-di { background: none; border: none; }
  .rm-m { position: relative; width: 44px; height: 44px; --c: #4ade80; }
  .rm-i {
    position: absolute; left: 7px; top: 3px; width: 30px; height: 30px; border-radius: 50%;
    background: var(--c); border: 2px solid #fff;
    display: grid; place-items: center;
    outline: 3px solid color-mix(in srgb, var(--c) 40%, transparent);
    box-shadow: 0 1px 3px rgba(0,0,0,.5);
    transition: transform .15s ease;
  }
  .rm-i svg { width: 19px; height: 19px; fill: #0b0d10; }
  .rm-b {
    position: absolute; left: 50%; top: 32px; transform: translateX(-50%);
    padding: 1px 6px; border-radius: 999px;
    background: #fff; color: #0b0d10; font-size: 10.5px; font-weight: 700; line-height: 14px;
    white-space: nowrap; box-shadow: 0 1px 4px rgba(0,0,0,.6);
  }
  .rm-m:hover .rm-i { transform: scale(1.12); }
  .rm-home { width: 36px; height: 36px; border-radius: 50%; background: #3b82f6; border: 3px solid #fff;
    display: grid; place-items: center; outline: 7px solid rgba(96,165,250,.35); box-shadow: 0 1px 4px rgba(0,0,0,.5); }
  .rm-home svg { width: 20px; height: 20px; fill: #fff; }

  .leaflet-popup-content-wrapper {
    background: #15171c; color: #e5e7eb; border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 6px 20px rgba(0,0,0,.5);
  }
  .leaflet-popup-tip { background: #15171c; }
  .leaflet-popup-content { margin: 10px 14px; font-size: 13px; line-height: 1.45; }
  .leaflet-popup-close-button { color: #9ca3af !important; }
  .pp-title { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .pp-title .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .pp-row { color: #cbd5e1; }
  .pp-link { display: inline-block; margin-top: 8px; padding: 5px 10px; border-radius: 8px; background: #2563eb; color: #fff !important; text-decoration: none; font-weight: 600; font-size: 12px; }

  .msg { position: absolute; inset: 0; display: grid; place-items: center; color: #9ca3af; font-size: 13px; z-index: 900; background: rgba(15,17,21,.7); text-align: center; padding: 16px; }
  .msg.err { color: #f87171; }
  .msg[hidden] { display: none; }

  /* Filter each tile once (cached per tile) instead of the whole pane, which
     would be re-filtered on every frame of a pan or zoom animation. */
  .leaflet-tile { filter: var(--rm-tile-filter, none); }
`;

class ScooterMapCard extends HTMLElement {
  static getStubConfig() {
    return { source: { provider: "entur", range_m: 800 }, zoom: 15, max_markers: 40 };
  }

  setConfig(config) {
    if (!config || (!config.entity && !config.source)) throw new Error("scooter-map-card: 'entity' or 'source' is required");
    this._config = {
      zoom: 15,
      max_markers: 40,
      tiles: "auto",          // auto | dark | light | osm | kartverket-dark | kartverket | kartverket-topo | kartverket-invert
      link: "android",        // android | ios | web | none  (pop-up "open in app" link)
      show_home: true,
      title: null,            // defaults to the localized "Scooters"
      show_title: true,
      show_stats: true,
      show_controls: true,
      show_attribution: true,
      interactive: true,
      stats_radii: [100, 300],
      marker_color: "battery", // battery | operator (circle by operator, battery badge keeps the battery colour)
      operator_colors: {},    // operator id, name or keyword -> colour, e.g. { ryde: "#22c55e", "YVO:Operator:voi": "#f97316" }
      show_legend: null,      // operator legend chip; default on in operator mode
      operator_names: {},     // operator id -> short label
      language: null,         // en | nb | sv | de (default: Home Assistant user language)
      tap_action: null,       // e.g. { action: navigate, navigation_path: "#scooter_map" }
      ...config,
    };
    this._t = pickLanguage(this._config.language, this._hass);
    if (this._config.show_legend == null) this._config.show_legend = this._config.marker_color === "operator";
    if (this._map) {
      this._applyTiles();
      for (const m of this._markers.values()) m.remove();   // colours/icons may have changed
      this._markers.clear();
      this._lastKey = null;
      if (this._config.source && this.isConnected) this._startSource();
      this._update();
    } else {
      this._render();
    }
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) {
      this._t = pickLanguage(this._config && this._config.language, hass);
      if (this._els && this._els.title && this._config && this._config.title == null) this._els.title.textContent = this._t.title;
      if (this._config && this._config.source && this.isConnected) this._startSource();
    }
    this._update();
  }

  getCardSize() {
    return 5;
  }

  getGridOptions() {
    // Default tile size in sections views and bubble-card pop-ups (56 px rows).
    // Override per card with grid_options: { columns: full, rows: N }.
    const rows = Number(this._config && this._config.rows) || 5;
    return { columns: 12, rows, min_columns: 4, min_rows: 3 };
  }

  connectedCallback() {
    if (this._map) setTimeout(() => this._map.invalidateSize(), 50);
    this._startSource();
  }

  disconnectedCallback() {
    if (this._ro) this._ro.disconnect();
    this._ro = null;
    this._stopSource();
  }

  /* ---------------- data: source mode ---------------- */

  _startSource() {
    const src = this._config && this._config.source;
    if (!src) return;
    const centre = this._home();
    if (!centre) return; // wait for hass (home location) if lat/lon are not configured
    const key = JSON.stringify({ ...src, centre });
    if (this._unsub && this._srcKey === key) return;
    this._stopSource();
    const provider = getProvider(src.provider || "entur");
    if (!provider) {
      this._error = new Error(`unknown provider "${src.provider}"`);
      this._update();
      return;
    }
    this._srcKey = key;
    this._unsub = subscribe(key, () => provider.fetch(src, { centre }), src.refresh, (raw, err, at) => {
      this._error = err || null;
      if (raw) { this._list = this._buildList(raw, src, centre); this._listStamp = String(at); }
      this._update();
    });
  }

  _stopSource() {
    if (this._unsub) { this._unsub(); this._unsub = null; this._srcKey = null; }
  }

  _buildList(raw, src, centre) {
    const range = Number(src.range_m) || 800;
    const fallbackMax = Number(src.max_range_m) || null;
    const out = [];
    for (const v of raw) {
      if (v.lat == null || v.lon == null) continue;
      const d = Math.round(haversine(centre[0], centre[1], v.lat, v.lon));
      if (d > range) continue;
      let bat = v.fuel_pct != null ? v.fuel_pct : null;
      const max = v.max_range_m || fallbackMax;
      if (bat == null && v.range_m != null && max) bat = (100 * v.range_m) / max;
      if (bat != null) bat = Math.max(0, Math.min(100, Math.round(bat)));
      out.push({
        id: v.id, lat: v.lat, lon: v.lon, d, bat,
        km: v.range_m != null ? Math.round(v.range_m / 100) / 10 : null,
        url_android: v.url_android || null, url_ios: v.url_ios || null, url_web: v.url_web || null,
        operator: v.operator || null, operator_id: v.operator_id || null, form_factor: v.form_factor || null,
      });
    }
    return out.sort((a, b) => a.d - b.d).slice(0, Number(src.count) || 300);
  }

  /* ---------------- helpers ---------------- */

  _operatorName(v) {
    const id = v.operator_id || "";
    return (this._config.operator_names || {})[id] || OPERATOR_NAMES[id] || v.operator || (id ? id.split(":").pop() : null) || this._config.title || this._t.title;
  }

  _operatorColor(v) {
    const id = String(v.operator_id || ""), name = String(v.operator || "");
    const hay = `${id} ${name}`.toLowerCase();
    const custom = this._config.operator_colors || {};
    for (const [k, c] of Object.entries(custom)) {
      if (k === id || k === name || (k.length > 1 && hay.includes(k.toLowerCase()))) return c;
    }
    for (const [k, c] of OPERATOR_COLORS) if (hay.includes(k)) return c;
    return hashColor(id || name || "?");
  }

  _markerColor(v, bat) {
    return this._config.marker_color === "operator" ? this._operatorColor(v) : batteryColor(bat);
  }

  _handleTap(a) {
    switch (a.action) {
      case "navigate": {
        const path = a.navigation_path || "";
        if (a.navigation_replace) history.replaceState(null, "", path);
        else history.pushState(null, "", path);
        window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !!a.navigation_replace } }));
        break;
      }
      case "url":
        if (a.url_path) window.open(a.url_path, "_blank", "noopener");
        break;
      case "more-info":
        this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: a.entity || this._config.entity } }));
        break;
      case "recenter":
        this._recenter();
        break;
      default:
        this.dispatchEvent(new CustomEvent("hass-action", { bubbles: true, composed: true, detail: { config: { tap_action: a, entity: this._config.entity }, action: "tap" } }));
    }
  }

  /* ---------------- rendering ---------------- */

  _render() {
    const c = this._config;
    const root = this.shadowRoot || this.attachShadow({ mode: "open" });
    const h = this._config.height;
    root.innerHTML = `
      <style>${leafletCss}</style>
      <style>${STYLE}</style>
      <ha-card>
        <div class="wrap" style="${h ? `--rm-min-height:${/^\d+$/.test(String(h)) ? h + "px" : esc(h)}` : ""}">
          <div id="map"></div>
          <div class="hud">
            ${c.show_title ? `<span class="chip title">${svg(ICON_SCOOTER)}<span id="title">${esc(c.title != null ? c.title : this._t.title)}</span></span>` : ""}
            ${c.show_stats ? `<span class="chip" id="stats"></span>` : ""}
            ${c.show_legend ? `<span class="chip legend" id="legend" hidden></span>` : ""}
          </div>
          ${c.show_controls ? `<button class="btn center" id="center" title="${esc(this._t.center)}">${svg(ICON_CENTER)}</button>` : ""}
          <div class="msg" id="msg" hidden></div>
        </div>
      </ha-card>`;
    this._els = {
      map: root.getElementById("map"),
      stats: root.getElementById("stats"),
      legend: root.getElementById("legend"),
      title: root.getElementById("title"),
      msg: root.getElementById("msg"),
      wrap: root.querySelector(".wrap"),
    };
    const centerBtn = root.getElementById("center");
    if (centerBtn) centerBtn.addEventListener("click", () => this._recenter());
    if (c.tap_action && c.tap_action.action && c.tap_action.action !== "none") {
      this._els.wrap.style.cursor = "pointer";
      this._els.wrap.addEventListener("click", (ev) => {
        if (c.interactive && ev.target.closest(".leaflet-control, .leaflet-marker-icon, .leaflet-popup, .btn")) return;
        this._handleTap(c.tap_action);
      });
    }
    // Leaflet needs the container to have a size before init; defer to next frame.
    requestAnimationFrame(() => this._initMap());
  }

  _initMap() {
    if (this._map) return;
    const c = this._config;
    const inter = !!c.interactive;
    const map = L.map(this._els.map, {
      zoomControl: false,
      attributionControl: !!c.show_attribution,
      zoomSnap: 0.5,
      preferCanvas: false,
      dragging: inter,
      scrollWheelZoom: inter,
      doubleClickZoom: inter,
      touchZoom: inter,
      boxZoom: inter,
      keyboard: inter,
    });
    if (c.show_controls) L.control.zoom({ position: "bottomright" }).addTo(map);
    if (map.attributionControl) map.attributionControl.setPrefix(false);
    // While the card is hidden (closed pop-up: display:none) the container is
    // 0×0 and Leaflet would load nothing. Pretend it has a plausible size so
    // tiles and markers are ready before the pop-up first opens.
    const origGetSize = map.getSize.bind(map);
    const pw = Number(this._config.preload_width) || Math.round(window.innerWidth * 0.96) || 1200;
    const ph = Number(this._config.preload_height) || 800;
    map.getSize = () => {
      const s = origGetSize();
      return s.x > 0 && s.y > 0 ? s : L.point(pw, ph);
    };
    this._map = map;
    this._markers = new Map();
    this._applyTiles();

    this._ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      map.invalidateSize();
      if (r.width > 0 && r.height > 0 && !this._sized) {
        this._sized = true;
        const home = this._home();
        if (home) map.setView(home, this._config.zoom, { animate: false });
      }
    });
    this._ro.observe(this._els.wrap);

    const home = this._home();
    map.setView(home || [59.91, 10.75], this._config.zoom);
    if (this.isConnected) this._startSource();
    this._update();
  }

  _applyTiles() {
    const c = this._config;
    let name = c.tiles || "auto";
    if (name === "auto") name = inNorway(this._home()) ? "kartverket-dark" : "dark";
    const preset = TILES[name] || TILES.dark;
    const t = c.tile_url ? { url: c.tile_url, attribution: c.tile_attribution || "", filter: c.tile_filter || "" } : preset;
    if (this._tiles) this._tiles.remove();
    this._tiles = L.tileLayer(t.url, {
      attribution: t.attribution,
      maxZoom: 19,
      maxNativeZoom: 18,
      detectRetina: false,
    }).addTo(this._map);
    const extra = c.brightness != null && Number(c.brightness) !== 1 ? ` brightness(${Number(c.brightness)})` : "";
    const f = ((t.filter || "") + extra).trim();
    this._els.map.style.setProperty("--rm-tile-filter", f || "none");
    this._tilesName = name;
  }

  _home() {
    const c = this._config;
    if (c.home_lat != null && c.home_lon != null) return [Number(c.home_lat), Number(c.home_lon)];
    if (c.source && c.source.lat != null && c.source.lon != null) return [Number(c.source.lat), Number(c.source.lon)];
    const h = this._hass && this._hass.config;
    if (h && h.latitude != null) return [h.latitude, h.longitude];
    return null;
  }

  _recenter() {
    const home = this._home();
    if (home && this._map) this._map.setView(home, this._config.zoom, { animate: true });
  }

  _getList() {
    if (this._config.source) return this._list || null;
    const st = this._hass && this._hass.states[this._config.entity];
    if (!st || st.state === "unavailable" || st.state === "unknown") return null;
    return Array.isArray(st.attributes.list) ? st.attributes.list : [];
  }

  _dataKey(list) {
    if (this._config.source) return `${this._listStamp || "none"}:${list ? list.length : -1}:${this._error ? "e" : ""}`;
    const st = this._hass && this._hass.states[this._config.entity];
    return st ? `${st.last_updated}:${list ? list.length : -1}` : "none";
  }

  _update() {
    if (!this._map) return;
    if (!this._hass && !this._config.source) return;
    const home = this._home();
    const t = this._t;

    if (home && !this._homeMarker && this._config.show_home) {
      this._homeMarker = L.marker(home, {
        icon: L.divIcon({ className: "rm-di", html: `<div class="rm-home">${svg(ICON_HOME)}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] }),
        interactive: false,
        zIndexOffset: -100,
      }).addTo(this._map);
      if (!this._centered) {
        this._map.setView(home, this._config.zoom);
        this._centered = true;
      }
      if ((this._config.tiles || "auto") === "auto" && this._tilesName !== (inNorway(home) ? "kartverket-dark" : "dark")) this._applyTiles();
    }

    const list = this._getList();
    const key = this._dataKey(list);
    if (key === this._lastKey) return;
    this._lastKey = key;

    if (list == null) {
      if (this._config.source) {
        if (this._error) this._showMsg(t.error(this._error.message || String(this._error)), true);
        else this._showMsg(t.loading);
      } else this._showMsg(t.no_data(this._config.entity));
      return;
    }
    if (!list.length) this._showMsg(t.none);
    else this._showMsg(null);

    const shown = list.slice(0, this._config.max_markers);
    if (this._els.stats) {
      const radii = Array.isArray(this._config.stats_radii) ? this._config.stats_radii : [100, 300];
      const parts = radii.map((r) => t.within(list.filter((v) => v.d <= r).length, r));
      if (list.length) parts.push(t.nearest(list[0].d));
      const stale = this._config.source && this._error && list;
      this._els.stats.innerHTML = list.length || stale ? (stale ? `<span>⚠ ${esc(t.offline)}</span><span class="sep">·</span>` : "") + parts.map((p) => `<span>${p}</span>`).join('<span class="sep">·</span>') : "—";
      this._els.stats.classList.toggle("warn", !!stale);
    }

    if (this._els.legend && !this._config.show_legend) this._els.legend.hidden = true;
    else if (this._els.legend) {
      const ops = new Map();
      for (const v of shown) { const n = this._operatorName(v); if (!ops.has(n)) ops.set(n, this._operatorColor(v)); }
      this._els.legend.innerHTML = [...ops].map(([n, col]) => `<span><i class="dot" style="background:${col}"></i>${esc(n)}</span>`).join("");
      this._els.legend.hidden = ops.size === 0;
    }

    const seen = new Set();
    shown.forEach((v, i) => {
      const id = v.id || `idx-${i}`;
      seen.add(id);
      const bat = v.bat == null ? null : Math.max(0, Math.min(100, Math.round(Number(v.bat))));
      const sig = `${v.lat},${v.lon},${bat},${v.km},${v.form_factor || ""}`;
      let m = this._markers.get(id);
      if (m && m._rmSig === sig) return;
      if (!m) {
        m = L.marker([v.lat, v.lon], { icon: this._icon(v, bat), riseOnHover: true, interactive: !!this._config.interactive, keyboard: false });
        if (this._config.interactive) m.bindPopup(() => this._popup(m._rmData), { closeButton: true, autoPanPadding: [30, 30] });
        m.addTo(this._map);
        this._markers.set(id, m);
      } else {
        m.setLatLng([v.lat, v.lon]);
        if (m._rmBat !== bat || m._rmKm !== v.km) m.setIcon(this._icon(v, bat));
      }
      m._rmSig = sig;
      m._rmBat = bat;
      m._rmKm = v.km;
      m._rmData = v;
    });
    for (const [id, m] of this._markers) {
      if (!seen.has(id)) {
        m.remove();
        this._markers.delete(id);
      }
    }
  }

  _icon(v, bat) {
    const c = this._markerColor(v, bat);
    const label = bat != null ? `${bat}%` : v.km != null ? `${v.km} km` : "?";
    // In operator mode the badge carries the battery colour so both signals stay visible.
    const badgeStyle = this._config.marker_color === "operator" && bat != null ? ` style="background:${batteryColor(bat)}"` : "";
    return L.divIcon({
      className: "rm-di",
      html: `<div class="rm-m" style="--c:${c}"><div class="rm-i">${svg(iconFor(v.form_factor))}</div><div class="rm-b"${badgeStyle}>${esc(label)}</div></div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 18],
      popupAnchor: [0, -14],
    });
  }

  _popup(v) {
    const t = this._t;
    const bat = v.bat == null ? null : Math.round(Number(v.bat));
    const c = this._markerColor(v, bat);
    const link = this._config.link;
    const url = link === "ios" ? v.url_ios : link === "web" ? v.url_web : link === "android" ? v.url_android : null;
    const op = this._operatorName(v);
    return `
      <div class="pp-title"><span class="dot" style="background:${c}"></span>${esc(op)}${bat != null ? ` · ${bat} %` : ""}</div>
      ${v.km != null ? `<div class="pp-row">${esc(t.range(v.km))}</div>` : ""}
      <div class="pp-row">${esc(t.from(v.d != null ? v.d : "?", this._config.home_label || t.home))}</div>
      ${url ? `<a class="pp-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(t.open_in(op))}</a>` : ""}`;
  }

  _showMsg(text, err) {
    const el = this._els.msg;
    if (!text) {
      el.hidden = true;
      return;
    }
    el.textContent = text;
    el.classList.toggle("err", !!err);
    el.hidden = false;
  }
}

if (!customElements.get("scooter-map-card")) customElements.define("scooter-map-card", ScooterMapCard);
// Backwards-compatible alias for dashboards built with the original Ryde-only card.
if (!customElements.get("ryde-map-card")) customElements.define("ryde-map-card", class extends ScooterMapCard {});
window.customCards = window.customCards || [];
window.customCards.push({
  type: "scooter-map-card",
  name: "Scooter Map Card",
  description: "Shared e-scooters and bikes near home on a dark map with battery labels (Entur or any GBFS feed)",
  preview: false,
  documentationURL: "https://github.com/andersgar/scooter-map-card",
});
console.info(`%c SCOOTER-MAP-CARD %c ${VERSION} `, "color: #0b0d10; background: #4ade80; font-weight: 700;", "color: #4ade80; background: #0b0d10;");
