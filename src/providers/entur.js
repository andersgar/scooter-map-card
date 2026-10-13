// Entur Mobility API v2 (Norway): one GraphQL endpoint that aggregates the
// GBFS feeds of every shared-mobility operator in the country (Ryde, Voi,
// Dott, Bolt, the city bike schemes, car sharing...).
// Docs: https://developer.entur.org/pages-mobility-docs-mobility-v2
// Terms: free, NLOD licence, identify yourself with the ET-Client-Name header.
//
// source:
//   provider: entur
//   lat: 63.43      # centre (defaults to the Home Assistant home location)
//   lon: 10.43
//   range_m: 800
//   operators: ["YRY:Operator:Ryde"]        # empty/omitted = every operator
//   form_factors: ["SCOOTER_STANDING"]      # empty/omitted = every form factor
//   include_reserved: false
//   include_disabled: false

const DEFAULT_URL = "https://api.entur.io/mobility/v2/graphql";
const DEFAULT_CLIENT = "homeassistant-scooter-map-card";

const Q = `query ($lat: Float!, $lon: Float!, $range: Int!, $count: Int, $operators: [String], $formFactors: [FormFactor], $includeReserved: Boolean, $includeDisabled: Boolean) {
  vehicles(lat: $lat, lon: $lon, range: $range, count: $count, operators: $operators, formFactors: $formFactors, includeReserved: $includeReserved, includeDisabled: $includeDisabled) {
    id lat lon currentRangeMeters currentFuelPercent isReserved isDisabled
    vehicleType { formFactor maxRangeMeters propulsionType }
    rentalUris { android ios web }
    system { id operator { id name { translation { language value } } } }
  }
}`;

export default {
  id: "entur",
  async fetch(src, ctx) {
    const url = src.url || DEFAULT_URL;
    const centre = ctx.centre;
    if (!centre) throw new Error("no centre: set source.lat/lon or a Home Assistant home location");
    const variables = {
      lat: centre[0],
      lon: centre[1],
      range: Math.round(Number(src.range_m) || 800),
      count: Math.round(Number(src.count) || 300),
      operators: Array.isArray(src.operators) && src.operators.length ? src.operators : null,
      formFactors: Array.isArray(src.form_factors) && src.form_factors.length ? src.form_factors : null,
      includeReserved: !!src.include_reserved,
      includeDisabled: !!src.include_disabled,
    };
    // ET-Client-Name is Entur's own convention; other Lamassu instances
    // (e.g. MobiData BW) reject unknown headers in the CORS preflight.
    const headers = { "Content-Type": "application/json" };
    if (src.client_name || /entur\.io$/i.test(new URL(url).hostname)) headers["ET-Client-Name"] = src.client_name || DEFAULT_CLIENT;
    const r = await fetch(url, { method: "POST", headers, body: JSON.stringify({ query: Q, variables }) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (j.errors && j.errors.length) throw new Error(j.errors[0].message || "GraphQL error");
    return ((j.data && j.data.vehicles) || []).map((v) => {
      const op = (v.system && v.system.operator) || {};
      const tr = (op.name && op.name.translation) || [];
      return {
        id: v.id,
        lat: v.lat,
        lon: v.lon,
        range_m: v.currentRangeMeters != null ? Number(v.currentRangeMeters) : null,
        fuel_pct: v.currentFuelPercent != null ? Number(v.currentFuelPercent) * 100 : null,
        max_range_m: v.vehicleType && v.vehicleType.maxRangeMeters != null ? Number(v.vehicleType.maxRangeMeters) : null,
        form_factor: v.vehicleType ? v.vehicleType.formFactor : null,
        propulsion: v.vehicleType ? v.vehicleType.propulsionType : null,
        operator_id: op.id || (v.system && v.system.id) || null,
        operator: tr.length ? tr[0].value : null,
        url_android: v.rentalUris ? v.rentalUris.android : null,
        url_ios: v.rentalUris ? v.rentalUris.ios : null,
        url_web: v.rentalUris ? v.rentalUris.web : null,
      };
    });
  },
};
