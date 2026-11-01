// 행정동 경계 GeoJSON을 시·군·구별 public/dong-boundaries/<코드>.json으로 나눈다.
// 사용: node scripts/build-dong-boundaries.mjs <geojson 경로>
// 자료: github.com/vuski/admdongkor (통계청 SGIS 경계 가공, 데이터 CC BY 4.0). 새 버전이 나오면 다시 만든다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2];
if (!file) {
  console.error("사용: node scripts/build-dong-boundaries.mjs <geojson 경로>");
  process.exit(1);
}
const round = (c) => (typeof c[0] === "number" ? [+c[0].toFixed(5), +c[1].toFixed(5)] : c.map(round));
const bySgg = new Map();
for (const f of JSON.parse(fs.readFileSync(file, "utf8")).features) {
  const sgg = String(f.properties.adm_cd2).slice(0, 5);
  const coords = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  if (!bySgg.has(sgg)) bySgg.set(sgg, []);
  bySgg.get(sgg).push([String(f.properties.adm_nm).split(" ").pop(), round(coords)]);
}
const out = path.join(root, "public/dong-boundaries");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
let bytes = 0;
for (const [sgg, rows] of bySgg) {
  const text = JSON.stringify(rows);
  bytes += text.length;
  fs.writeFileSync(path.join(out, `${sgg}.json`), text);
}
const known = new Set();
for (const s of JSON.parse(fs.readFileSync(path.join(root, "src/lib/regions.json"), "utf8"))) for (const g of s.g) known.add(g.c);
const missing = [...known].filter((c) => !bySgg.has(c));
console.log(`시·군·구 ${bySgg.size}곳, ${(bytes / 1e6).toFixed(1)}MB, 지역 목록 ${known.size}곳 중 경계 없음 ${missing.length}곳 ${missing.join(",")}`);
