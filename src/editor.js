// Visual editor for scooter-map-card, shown in the dashboard card editor.
// Built on Home Assistant's own <ha-form> (selectors, entity pickers, switches).
import { pickEditorLanguage } from "./i18n.js";

const LANGS = [
  { value: "", label: "Home Assistant" }, { value: "en", label: "English" }, { value: "nb", label: "Norsk" },
  { value: "sv", label: "Svenska" }, { value: "de", label: "Deutsch" },
];
const TILES = ["auto", "dark", "light", "osm", "kartverket-dark", "kartverket", "kartverket-topo", "kartverket-invert"].map((v) => ({ value: v, label: v }));
const FORM_FACTORS = ["SCOOTER_STANDING", "SCOOTER_SEATED", "BICYCLE", "CARGO_BICYCLE", "MOPED", "CAR", "OTHER"].map((v) => ({ value: v, label: v }));
const OPERATORS = [
  "YRY:Operator:Ryde", "YVO:Operator:voi", "YDT:Operator:dott", "YBO:Operator:bolt", "YOS:Operator:oslobysykkel", "YBE:Operator:bergenbysykkel",
  "YTR:Operator:trondheimbysykkel", "YKO:Operator:kolumbusbysykkel", "SHA:Operator:Farte", "YHZ:Operator:Hertz", "YOT:Operator:Otto", "HYR:Operator:Hyre", "YGA:Operator:getaround",
].map((v) => ({ value: v, label: v }));

const STYLE = `
  :host { display: block; }
  h3 { font-size: 14px; font-weight: 600; margin: 20px 0 6px; color: var(--primary-text-color); }
  h3:first-child { margin-top: 0; }
  p.help { margin: 0 0 10px; font-size: 12px; color: var(--secondary-text-color); }
  button { font: inherit; font-size: 13px; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--divider-color, #444);
    background: var(--card-background-color, #222); color: var(--primary-text-color); cursor: pointer; }
  .modes { display: flex; gap: 8px; margin-bottom: 10px; }
  .modes button[aria-pressed="true"] { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
`;

async function ensureHaForm() {
  if (customElements.get("ha-form")) return;
  try {
    const helpers = await window.loadCardHelpers();
    const el = helpers.createCardElement({ type: "entities", entities: [] });
    if (el && el.constructor && el.constructor.getConfigElement) await el.constructor.getConfigElement();
  } catch (e) { /* ignore */ }
  await customElements.whenDefined("ha-form");
}

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && v !== null));
const numList = (s) => String(s || "").split(",").map((x) => Number(x.trim())).filter((n) => Number.isFinite(n) && n > 0);
const tri = (v) => (v == null ? "" : String(!!v));
const untri = (v) => (v === "" ? null : v === "true");

export class ScooterMapCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config || {}));
    if (!this._config.source && !this._config.entity) this._config.entity = "";
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._t = pickEditorLanguage(hass);
    if (this.shadowRoot) for (const f of this.shadowRoot.querySelectorAll("ha-form")) f.hass = hass;
  }

  get _mode() { return this._config.source ? "source" : "entity"; }

  _emit() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  async _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._t = this._t || pickEditorLanguage(this._hass);
    await ensureHaForm();
    if (this._rendering) return;
    this._rendering = true;
    const t = this._t;
    const root = this.shadowRoot;
    root.innerHTML = `<style>${STYLE}</style>
      <h3>${t.section_data}</h3>
      <div class="modes">
        <button id="m-entity" aria-pressed="${this._mode === "entity"}">${t.mode_entity}</button>
        <button id="m-source" aria-pressed="${this._mode === "source"}">${t.mode_source}</button>
      </div>
      <div id="data"></div>
      <h3>${t.section_display}</h3>
      <div id="display"></div>
      <h3>${t.section_advanced}</h3>
      <p class="help">${t.advanced_help}</p>
      <div id="advanced"></div>`;
    root.getElementById("m-entity").addEventListener("click", () => this._switchMode("entity"));
    root.getElementById("m-source").addEventListener("click", () => this._switchMode("source"));
    this._renderData(root.getElementById("data"));
    this._renderDisplay(root.getElementById("display"));
    this._renderAdvanced(root.getElementById("advanced"));
    this._rendering = false;
  }

  _switchMode(mode) {
    if (mode === this._mode) return;
    if (mode === "entity") {
      this._savedSource = this._config.source;
      delete this._config.source;
      this._config.entity = this._savedEntity || "";
    } else {
      this._savedEntity = this._config.entity;
      delete this._config.entity;
      this._config.source = this._savedSource || { provider: "entur", range_m: 800 };
    }
    this._emit();
    this._render();
  }

  _form(container, schema, data, onChange) {
    const f = document.createElement("ha-form");
    f.hass = this._hass;
    f.schema = schema;
    f.data = data;
    f.computeLabel = (s) => this._t.labels[s.name] || s.name;
    f.computeHelper = (s) => this._t.helpers[s.name] || "";
    f.addEventListener("value-changed", (ev) => { ev.stopPropagation(); onChange(ev.detail.value); });
    container.appendChild(f);
    return f;
  }

  _renderData(el) {
    if (this._mode === "entity") {
      this._form(el, [{ name: "entity", required: true, selector: { entity: { domain: "sensor" } } }], { entity: this._config.entity || "" }, (v) => {
        this._config.entity = v.entity || "";
        this._emit();
      });
      return;
    }
    const src = this._config.source;
    const isGbfs = src.provider === "gbfs";
    const schema = [
      { type: "grid", name: "", schema: [
        { name: "provider", selector: { select: { mode: "dropdown", custom_value: true, options: [
          { value: "entur", label: "Entur / Lamassu (GraphQL)" }, { value: "gbfs", label: "GBFS feed" }] } } },
        { name: "refresh", selector: { number: { min: 10, max: 600, mode: "box", unit_of_measurement: "s" } } },
      ] },
      { name: "url", selector: { text: {} } },
      { type: "grid", name: "", schema: [
        { name: "lat", selector: { number: { min: -90, max: 90, step: "any", mode: "box" } } },
        { name: "lon", selector: { number: { min: -180, max: 180, step: "any", mode: "box" } } },
      ] },
      { type: "grid", name: "", schema: [
        { name: "range_m", selector: { number: { min: 50, max: 5000, mode: "box", unit_of_measurement: "m" } } },
        { name: "count", selector: { number: { min: 1, max: 1000, mode: "box" } } },
      ] },
      ...(isGbfs ? [
        { type: "grid", name: "", schema: [
          { name: "operator", selector: { text: {} } },
          { name: "max_range_m", selector: { number: { min: 1000, max: 500000, mode: "box", unit_of_measurement: "m" } } },
        ] },
      ] : [
        { name: "operators", selector: { select: { multiple: true, custom_value: true, options: OPERATORS } } },
        { name: "form_factors", selector: { select: { multiple: true, options: FORM_FACTORS } } },
      ]),
      { type: "grid", name: "", schema: [
        { name: "include_reserved", selector: { boolean: {} } },
        { name: "include_disabled", selector: { boolean: {} } },
      ] },
    ];
    const data = { ...src, operators: src.operators || [], form_factors: src.form_factors || [], include_reserved: !!src.include_reserved, include_disabled: !!src.include_disabled };
    this._form(el, schema, data, (v) => {
      const prov = v.provider;
      const out = clean({ ...this._config.source, ...v });
      if (!out.operators || !out.operators.length) delete out.operators;
      if (!out.form_factors || !out.form_factors.length) delete out.form_factors;
      if (!v.include_reserved) delete out.include_reserved;
      if (!v.include_disabled) delete out.include_disabled;
      this._config.source = out;
      this._emit();
      if ((prov === "gbfs") !== isGbfs) this._render();
    });
  }

  _renderDisplay(el) {
    const c = this._config;
    const t = this._t;
    const schema = [
      { type: "grid", name: "", schema: [
        { name: "title", selector: { text: {} } },
        { name: "language", selector: { select: { mode: "dropdown", options: LANGS } } },
      ] },
      { type: "grid", name: "", schema: [
        { name: "zoom", selector: { number: { min: 10, max: 19, step: 0.5, mode: "box" } } },
        { name: "max_markers", selector: { number: { min: 1, max: 500, mode: "box" } } },
      ] },
      { type: "grid", name: "", schema: [
        { name: "marker_color", selector: { select: { mode: "dropdown", options: [
          { value: "battery", label: t.marker_battery }, { value: "operator", label: t.marker_operator }] } } },
        { name: "tiles", selector: { select: { mode: "dropdown", options: TILES } } },
      ] },
      { type: "grid", name: "", schema: [
        { name: "link", selector: { select: { mode: "dropdown", options: ["android", "ios", "web", "none"].map((v) => ({ value: v, label: v })) } } },
        { name: "show_legend", selector: { select: { mode: "dropdown", options: [
          { value: "", label: t.auto }, { value: "true", label: t.yes }, { value: "false", label: t.no }] } } },
      ] },
      { type: "grid", name: "", schema: [
        { name: "show_title", selector: { boolean: {} } },
        { name: "show_stats", selector: { boolean: {} } },
        { name: "show_controls", selector: { boolean: {} } },
        { name: "show_attribution", selector: { boolean: {} } },
        { name: "show_home", selector: { boolean: {} } },
        { name: "interactive", selector: { boolean: {} } },
      ] },
      { name: "tap_action", selector: { ui_action: {} } },
    ];
    const data = {
      title: c.title ?? "", language: c.language || "", zoom: c.zoom ?? 15, max_markers: c.max_markers ?? 40,
      marker_color: c.marker_color || "battery", tiles: c.tiles || "auto", link: c.link || "android", show_legend: tri(c.show_legend),
      show_title: c.show_title !== false, show_stats: c.show_stats !== false, show_controls: c.show_controls !== false,
      show_attribution: c.show_attribution !== false, show_home: c.show_home !== false, interactive: c.interactive !== false,
      tap_action: c.tap_action,
    };
    this._form(el, schema, data, (v) => {
      const out = { ...this._config };
      const set = (k, val, dflt) => { if (val === dflt || val === "" || val == null) delete out[k]; else out[k] = val; };
      set("title", v.title, "");
      set("language", v.language, "");
      set("zoom", v.zoom, 15);
      set("max_markers", v.max_markers, 40);
      set("marker_color", v.marker_color, "battery");
      set("tiles", v.tiles, "auto");
      set("link", v.link, "android");
      set("show_legend", untri(v.show_legend), null);
      for (const k of ["show_title", "show_stats", "show_controls", "show_attribution", "show_home", "interactive"]) set(k, v[k], true);
      set("tap_action", v.tap_action && v.tap_action.action && v.tap_action.action !== "none" ? v.tap_action : null, null);
      this._config = out;
      this._emit();
    });
  }

  _renderAdvanced(el) {
    const c = this._config;
    const schema = [
      { type: "grid", name: "", schema: [
        { name: "stats_radii", selector: { text: {} } },
        { name: "brightness", selector: { number: { min: 0.3, max: 2, step: 0.1, mode: "box" } } },
      ] },
      { type: "grid", name: "", schema: [
        { name: "height", selector: { text: {} } },
        { name: "home_label", selector: { text: {} } },
      ] },
      { type: "grid", name: "", schema: [
        { name: "home_lat", selector: { number: { min: -90, max: 90, step: "any", mode: "box" } } },
        { name: "home_lon", selector: { number: { min: -180, max: 180, step: "any", mode: "box" } } },
      ] },
      { name: "tile_url", selector: { text: {} } },
      { type: "grid", name: "", schema: [
        { name: "tile_attribution", selector: { text: {} } },
        { name: "tile_filter", selector: { text: {} } },
      ] },
      { name: "operator_colors", selector: { object: {} } },
      { name: "operator_names", selector: { object: {} } },
    ];
    const data = {
      stats_radii: (c.stats_radii || [100, 300]).join(", "), brightness: c.brightness ?? 1, height: c.height ?? "", home_label: c.home_label ?? "",
      home_lat: c.home_lat, home_lon: c.home_lon, tile_url: c.tile_url ?? "", tile_attribution: c.tile_attribution ?? "", tile_filter: c.tile_filter ?? "",
      operator_colors: c.operator_colors || {}, operator_names: c.operator_names || {},
    };
    this._form(el, schema, data, (v) => {
      const out = { ...this._config };
      const radii = numList(v.stats_radii);
      if (radii.length && JSON.stringify(radii) !== JSON.stringify([100, 300])) out.stats_radii = radii; else delete out.stats_radii;
      if (v.brightness == null || Number(v.brightness) === 1) delete out.brightness; else out.brightness = v.brightness;
      for (const k of ["height", "home_label", "tile_url", "tile_attribution", "tile_filter"]) { if (v[k]) out[k] = v[k]; else delete out[k]; }
      for (const k of ["home_lat", "home_lon"]) { if (v[k] == null || v[k] === "") delete out[k]; else out[k] = v[k]; }
      for (const k of ["operator_colors", "operator_names"]) { if (v[k] && typeof v[k] === "object" && Object.keys(v[k]).length) out[k] = v[k]; else delete out[k]; }
      this._config = out;
      this._emit();
    });
  }
}
