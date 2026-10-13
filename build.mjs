// Bundle src/ + Leaflet (JS and CSS) into one file for HACS: dist/scooter-map-card.js
import { build, context } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const leafletVersion = JSON.parse(readFileSync(new URL("./node_modules/leaflet/package.json", import.meta.url), "utf8")).version;
const watch = process.argv.includes("--watch");

const opts = {
  entryPoints: ["src/scooter-map-card.js"],
  bundle: true,
  format: "esm",
  target: ["es2020"],
  outfile: "dist/scooter-map-card.js",
  minify: !watch,
  sourcemap: false,
  legalComments: "inline",
  loader: { ".css": "text" },
  define: { __VERSION__: JSON.stringify(pkg.version), __LEAFLET_VERSION__: JSON.stringify(leafletVersion) },
  banner: {
    js: `/*! scooter-map-card ${pkg.version} — MIT — https://github.com/andersgar/scooter-map-card\n * bundles Leaflet ${leafletVersion} — BSD-2-Clause — https://leafletjs.com */`,
  },
};

if (watch) {
  const ctx = await context(opts);
  await ctx.watch();
  console.log("watching src/ …");
} else {
  await build(opts);
  console.log(`built dist/scooter-map-card.js (${pkg.version}, leaflet ${leafletVersion})`);
}
