# Changelog

## 1.0.0 — 2026-10-13

First public release (successor of the Ryde-only `ryde-map-card`; that element
name still works).

- Source mode: the card fetches vehicles itself from Entur (Norway, all
  operators), any Lamassu instance such as MobiData BW via `url`, or any GBFS
  2.x/3.x feed that allows browser access.
- Entity mode: any sensor with the documented `list` attribute; Entur and GBFS
  packages included.
- Operator and form-factor filters, bike and car marker icons, battery from
  fuel percent or range estimate, operator name and app link in the pop-up.
- Leaflet bundled into the single HACS file; tiles `auto` (Kartverket in
  Norway, OpenStreetMap dark elsewhere); en / nb / sv / de strings.
- Runtime provider registry (`window.scooterMapProviders`).
