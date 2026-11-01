// 임장 노트용 행정동 경계를 public/dong-boundaries/에 복사하고, 좌표로 시·군·구를 찾을 범위 목록(index.json)을 만든다.
// 원본: commercial-land-trade-alert/public/dong-boundaries (github.com/vuski/admdongkor, 통계청 SGIS 경계 가공, CC BY 4.0).
// 사용: node scripts/build-onsite-boundaries.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "../commercial-land-trade-alert/public/dong-boundaries");
const out = path.join(root, "public/dong-boundaries");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const index = [];
for (const file of fs.readdirSync(src)) {
  const text = fs.readFileSync(path.join(src, file), "utf8");
  fs.writeFileSync(path.join(out, file), text);
  let [minLon, minLat, maxLon, maxLat] = [180, 90, -180, -90];
  for (const [, polygons] of JSON.parse(text)) {
    for (const polygon of polygons) {
      for (const [lon, lat] of polygon[0]) {
        minLon = Math.min(minLon, lon);
        minLat = Math.min(minLat, lat);
        maxLon = Math.max(maxLon, lon);
        maxLat = Math.max(maxLat, lat);
      }
    }
  }
  index.push([file.replace(".json", ""), minLon, minLat, maxLon, maxLat]);
}
fs.writeFileSync(path.join(out, "index.json"), JSON.stringify(index));
console.log(`시·군·구 ${index.length}곳`);
