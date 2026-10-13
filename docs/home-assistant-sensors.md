# Entity mode: feeding the card from Home Assistant sensors

In entity mode the card reads one entity and draws its `list` attribute.
Choose this when the feed blocks browsers (Lime, Voi, Donkey Republic), when
you want sensors for automations ("a scooter with ≥ 70 % is within 150 m"),
or when one fetch should serve every device on the network.

## The list format

`attributes.list` is an array sorted by distance:

| Key | Type | Meaning |
|---|---|---|
| `id` | string | Stable vehicle id; markers with the same id move instead of being recreated. |
| `lat`, `lon` | number | Position. |
| `d` | int | Distance from home in metres (the HUD stats and sorting use it). |
| `bat` | int or null | Battery 0–100. `null` shows the range instead. |
| `km` | number | Remaining range in km. |
| `url_android`, `url_ios`, `url_web` | string | Deep links that open the operator's app on that vehicle (`link:` picks one). |
| `operator_id`, `operator` | string | Optional; shown in the pop-up (`operator_names` maps ids to labels). |
| `form_factor` | string | Optional; `BICYCLE`/`CARGO_BICYCLE` and `CAR` change the marker icon. |

`state` is free (the count is handy). Exclude the sensor from the recorder.

## Packages

- [`scooter_map_entur.yaml`](../homeassistant/packages/scooter_map_entur.yaml):
  one `rest` POST to Entur every 30 s with your coordinates and operator
  filter, plus template sensors `sensor.scooter_list` (the card's entity),
  `sensor.scooter_nearest` (m) and `sensor.scooters_within_300_m`. Battery
  comes from `currentFuelPercent` when published, else from range ÷ max range.
  Works against MobiData BW by changing `resource:` and removing the
  `ET-Client-Name` header.
- [`scooter_map_gbfs.yaml`](../homeassistant/packages/scooter_map_gbfs.yaml):
  same, for any operator's `vehicle_status` / `free_bike_status` file (GBFS 2.x
  or 3.x) with an optional `vehicle_types` fetch for the max range. The
  distance filter runs in the template, since GBFS files are city-wide.

Copy the file to `config/packages/`, enable packages in `configuration.yaml`
if you have not (`homeassistant: packages: !include_dir_named packages`),
edit the coordinates and URLs, check the configuration and restart.

Example automation on top of the package:

```yaml
automation:
  - alias: "Scooter nearby with good battery"
    triggers:
      - trigger: numeric_state
        entity_id: sensor.scooters_within_300_m
        above: 0
    conditions:
      - condition: template
        value_template: >-
          {{ (state_attr('sensor.scooter_list', 'list') or [])
             | selectattr('d', 'le', 150) | selectattr('bat', 'ge', 70) | list | count > 0 }}
    actions:
      - action: notify.mobile_app_phone
        data:
          message: "A scooter with ≥ 70 % is within 150 m."
```
