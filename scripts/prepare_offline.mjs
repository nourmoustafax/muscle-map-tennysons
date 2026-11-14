import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
const dist = new URL("../dist/", import.meta.url);
const files = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/manus-routes.json",
  "/data/research.json",
  "/data/simulated.json",
  "/data/source-manifest.json",
  "/data/emergency-references.json",
  "/assets/muscular-atlas.glb",
  "/assets/anatomy-manifest.json",
  ...readdirSync(new URL("assets/", dist))
    .filter((f) => /\.(js|css)$/.test(f))
    .map((f) => "/assets/" + f),
];
const hash = createHash("sha256");
for (const file of files.filter((f) => f !== "/"))
  hash.update(readFileSync(new URL(file.slice(1), dist)));
const cacheKey = "musclemap-" + hash.digest("hex").slice(0, 16);
writeFileSync(
  new URL("offline-manifest.json", dist),
  JSON.stringify({ cacheKey, files }, null, 2) + "\n",
);
let sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
sw = sw.replace("__BUILD_CACHE_KEY__", cacheKey);
writeFileSync(new URL("sw.js", dist), sw);
console.log(`Offline bundle ${cacheKey}: ${files.length} local assets`);
