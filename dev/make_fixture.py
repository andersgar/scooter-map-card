#!/usr/bin/env python3
"""Rebuild dev/fixture-entur.json: raw Entur mobility response around the example
centre (Buran, Trondheim). Run with -I from the repo root: python -I dev/make_fixture.py"""
import json, pathlib, urllib.request

LAT, LON = 63.4364, 10.4250
Q = f"""{{ vehicles(lat: {LAT}, lon: {LON}, range: 800, count: 150, operators: ["YRY:Operator:Ryde"],
  formFactors: [SCOOTER_STANDING], includeReserved: false, includeDisabled: false)
  {{ id lat lon currentRangeMeters vehicleType {{ maxRangeMeters }} }} }}"""
req = urllib.request.Request("https://api.entur.io/mobility/v2/graphql", data=json.dumps({"query": Q}).encode(),
                             headers={"Content-Type": "application/json", "ET-Client-Name": "scooter-map-card-dev"})
data = json.load(urllib.request.urlopen(req, timeout=30))
p = pathlib.Path(__file__).with_name("fixture-entur.json")
p.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
print(len(data["data"]["vehicles"]), "vehicles ->", p)
