// Provider registry. A provider is { id, fetch(source, ctx) -> Promise<Vehicle[]> }
// with ctx = { centre: [lat, lon] | null } and
// Vehicle = { id, lat, lon, range_m, fuel_pct (0-100), max_range_m, form_factor,
//             propulsion, operator_id, operator, url_android, url_ios, url_web }
// (null for anything the feed does not publish). The card computes distance,
// battery estimate and sorting. Third-party providers can be registered at
// runtime from another dashboard resource, no fork needed:
//   window.scooterMapProviders = window.scooterMapProviders || {};
//   window.scooterMapProviders.myapi = { id: "myapi", fetch: async (src, ctx) => [...] };
import entur from "./entur.js";
import gbfs from "./gbfs.js";

const builtin = { entur, gbfs };

const external = () => (typeof window !== "undefined" && window.scooterMapProviders) || {};

export function getProvider(name) {
  return external()[name] || builtin[name] || null;
}

export const providerNames = () => Object.keys({ ...builtin, ...external() });
