// Bundle Esri dark-gray basemap tiles for offline use. Node 22, no deps.
// Usage: node scripts/fetch-tiles.mjs   (idempotent: existing files are skipped)
import fs from "node:fs";
import path from "node:path";

const URL_T = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const OUT = path.resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "../public/tiles");
const BOXES = [
  // Kakinada / Godavari coast, detail zooms
  { minLat: 16, maxLat: 18, minLon: 81.5, maxLon: 83.5, zooms: [7, 8, 9, 10, 11, 12] },
  // Whole India coast, overview zooms
  { minLat: 6, maxLat: 24, minLon: 68, maxLon: 92, zooms: [5, 6] },
];
const CONCURRENCY = 8;

const lon2x = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2y = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

const jobs = [];
for (const b of BOXES)
  for (const z of b.zooms)
    for (let x = lon2x(b.minLon, z); x <= lon2x(b.maxLon, z); x++)
      for (let y = lat2y(b.maxLat, z); y <= lat2y(b.minLat, z); y++) jobs.push({ z, x, y });

let done = 0, skipped = 0, failed = 0, bytes = 0;
async function fetchTile({ z, x, y }, attempt = 0) {
  const file = path.join(OUT, String(z), String(x), `${y}.png`);
  if (fs.existsSync(file)) { skipped++; bytes += fs.statSync(file).size; return; }
  try {
    const res = await fetch(URL_T.replace("{z}", z).replace("{y}", y).replace("{x}", x));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
    done++; bytes += buf.length;
  } catch (e) {
    if (attempt < 1) return fetchTile({ z, x, y }, attempt + 1);
    failed++; console.error(`fail ${z}/${x}/${y}: ${e.message}`);
  }
}

let i = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (i < jobs.length) await fetchTile(jobs[i++]); }));
console.log(`tiles: ${jobs.length} total, ${done} downloaded, ${skipped} existed, ${failed} failed, ${(bytes / 1e6).toFixed(1)} MB in ${OUT}`);
process.exit(failed ? 1 : 0);
