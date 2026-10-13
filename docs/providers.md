# Data providers

The card can get vehicles in two ways:

1. **Source mode** – the card calls a public API from the browser. Needs an
   API without a key that sends CORS headers.
2. **Entity mode** – Home Assistant fetches the data (`rest:` sensor) and a
   template sensor reshapes it. Works with any feed, CORS or not. See
   [home-assistant-sensors.md](home-assistant-sensors.md).

Everything below was checked on 2026-10-13 by calling the APIs.

## How shared-mobility data works

Every operator publishes a [GBFS](https://github.com/MobilityData/gbfs) feed
(General Bikeshare Feed Specification): a `gbfs.json` discovery file pointing
to `vehicle_status` (3.x) / `free_bike_status` (2.x) for free-floating
vehicles, `station_information` + `station_status` for docked bikes, and
`vehicle_types` with form factor and max range. Battery is
`current_fuel_percent` (0–1) when the operator publishes it (Voi, Bolt, Dott
do) or must be estimated from `current_range_meters / max_range_meters` (Ryde
publishes range only, max 56.3 km).

National or regional *aggregators* load all those feeds and offer one API with
a "vehicles near a point" query. Entur's aggregator software,
[Lamassu](https://github.com/entur/lamassu), is open source and used by others,
so the `entur` provider works unchanged against any Lamassu instance.

## Built-in providers

### `entur` – Norway (and any Lamassu instance)

- Endpoint `https://api.entur.io/mobility/v2/graphql`. No key; the card sends
  `ET-Client-Name` as Entur asks. CORS open. NLOD licence.
- Query `vehicles(lat, lon, range, count, operators, formFactors,
  includeReserved, includeDisabled)` with `currentRangeMeters`,
  `currentFuelPercent`, `vehicleType { formFactor maxRangeMeters }`,
  `rentalUris { android ios web }`, `system { operator { id name } }`.
- Operators (October 2026): `YRY:Operator:Ryde`, `YVO:Operator:voi`,
  `YDT:Operator:dott` (Tier is now Dott), `YBO:Operator:bolt`,
  `YOS:Operator:oslobysykkel`, `YBE:Operator:bergenbysykkel`,
  `YTR:Operator:trondheimbysykkel`, `YKO:Operator:kolumbusbysykkel`,
  `SHA:Operator:Farte`, car sharing `YHZ:Operator:Hertz`, `YOT:Operator:Otto`,
  `HYR:Operator:Hyre`, `YGA:Operator:getaround`. Live list:
  `{ operators { id name { translation { value } } } }`.
- Form factors: `SCOOTER_STANDING`, `SCOOTER_SEATED`, `BICYCLE`,
  `CARGO_BICYCLE`, `MOPED`, `CAR`, `OTHER`.
- Docked city bikes are stations, not vehicles; the same API has a
  `stations(lat, lon, range)` query (`numVehiclesAvailable`,
  `numDocksAvailable`). Not drawn by the card yet.
- **MobiData BW (Baden-Württemberg, Germany)** runs Lamassu at
  `https://api.mobidata-bw.de/sharing/graphql`: 56 operators including Lime,
  Voi, Bolt, Dott, nextbike, Call a Bike, Stadtmobil. No key, CORS open,
  licence DL-DE-BY 2.0. Use `provider: entur` with that `url:`; the card
  does not send `ET-Client-Name` there (the server rejects unknown headers).
- **Self-hosting Lamassu** (`docker-compose-simple.yml` in the Lamassu repo,
  feeds listed in `feedproviders.yml`) is the cleanest way to get operators
  that block browsers (Lime, Voi) into source mode on your own network.

### `gbfs` – any single operator feed

- `url:` is the `gbfs.json` discovery file (2.x or 3.x; `language:` picks the
  2.x language block) or a `vehicle_status` / `free_bike_status` URL directly
  (then `vehicle_types_url:` is optional).
- The card filters by `range_m` around `lat`/`lon`, drops reserved and
  disabled vehicles, estimates battery from `current_fuel_percent` or range ÷
  vehicle type max range (fallback `max_range_m`).
- Find feeds in the [systems catalogue](https://github.com/MobilityData/gbfs/blob/master/systems.csv)
  (~1,500 systems; column *Auto-Discovery URL*).
- **CORS (probed from a browser origin):**
  - allow: Dott (`gbfs.api.ridedott.com`), Bird (`mds.bird.co`), Bolt
    (`mds.bolt.eu`), nextbike (`gbfs.nextbike.net`), Lyft / Citi Bike
    (`gbfs.lyft.com`, `gbfs.citibikenyc.com`), Urban Sharing / Oslo Bysykkel
    (`gbfs.urbansharing.com`, docked), MobiData BW feeds.
  - block: Lime (`data.lime.bike`), Voi (`api.voiapp.io`), Zeus, Getaround,
    Donkey Republic. For these use an aggregator or entity mode.
  - Entur's per-system GBFS files (`api.entur.io/mobility/v2/gbfs/v3/<system>/…`)
    answered inconsistently from a browser during testing; use the GraphQL
    endpoint for Entur.

## Other aggregators

| Aggregator | Coverage | Access | Notes |
|---|---|---|---|
| [Transitous](https://transitous.org) `GET /api/v1/rentals?point=lat,lon&radius=800&withVehicles=true` | worldwide, loads GBFS from many national feeds | no key, CORS open, non-commercial | Returns id, position, form factor, rental URIs, but no range or fuel, so markers would have no battery. Not built in. |
| [CityBikes](https://api.citybik.es/v2/) | 800+ docked bike networks | no key, CORS open | Stations with `free_bikes` / `empty_slots`; core HA `citybikes` integration uses it. Stations are not drawn yet. |
| Digitransit (Finland) `rentalVehicles(formFactors)` | HSL area, Bolt etc. | key required, CORS open | GraphQL with `fuel { percent range }`; a provider with the key in the dashboard is feasible. |

No Home Assistant integration exposes generic GBFS data today; the
[GBFS package](../homeassistant/packages/scooter_map_gbfs.yaml) in this repo
does it with a `rest:` sensor.

## Adding a provider

A provider is `{ id, async fetch(source, ctx) }` where `ctx.centre` is
`[lat, lon]`, returning vehicles:

```js
{
  id: "…",              // stable id (markers move instead of being recreated)
  lat: 63.43, lon: 10.42,
  range_m: 42200,       // current range, or null
  fuel_pct: 82,         // 0–100, or null (then range_m / max_range_m is used)
  max_range_m: 56300,   // or null
  form_factor: "SCOOTER_STANDING",   // picks the marker icon
  propulsion: "ELECTRIC",
  operator_id: "YRY:Operator:Ryde", operator: "Ryde",
  url_android: "…", url_ios: "…", url_web: "…",
}
```

The card computes distance, filters by `range_m`, estimates battery and sorts.
Register from any other dashboard resource, no fork needed:

```js
window.scooterMapProviders = window.scooterMapProviders || {};
window.scooterMapProviders.transitous = {
  id: "transitous",
  async fetch(src, ctx) {
    const [lat, lon] = ctx.centre;
    const r = await fetch(`https://api.transitous.org/api/v1/rentals?point=${lat},${lon}&radius=${src.range_m || 800}&withVehicles=true`);
    const j = await r.json();
    return (j.vehicles || []).map((v) => ({
      id: v.id, lat: v.lat, lon: v.lon, range_m: null, fuel_pct: null, max_range_m: null,
      form_factor: v.formFactor, propulsion: v.propulsionType,
      operator_id: v.providerId, operator: v.providerId,
      url_android: v.rentalUriAndroid, url_ios: v.rentalUriIOS, url_web: v.rentalUriWeb,
    }));
  },
};
```

Built-in providers live in `src/providers/`; pull requests welcome.
