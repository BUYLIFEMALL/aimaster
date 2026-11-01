// 행안부 KIKmix(행정동 ↔ 법정동)를 지역 찾기용 public/admin-dongs.json으로 바꾼다.
// 사용: node scripts/build-admin-dongs.mjs <KIKmix 파일 경로> <기준일 YYYY-MM-DD>
// 자료: 행정안전부 주민등록·인감 게시판 「행정기관(행정동) 및 관할구역(법정동) 코드」 jscode*.zip. 행정동이 바뀌면 새 파일로 다시 만든다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [file, asOf] = process.argv.slice(2);
if (!file || !/^\d{4}-\d{2}-\d{2}$/.test(asOf || "")) {
  console.error("사용: node scripts/build-admin-dongs.mjs <KIKmix 파일 경로> <기준일 YYYY-MM-DD>");
  process.exit(1);
}

const known = new Set();
for (const s of JSON.parse(fs.readFileSync(path.join(root, "src/lib/regions.json"), "utf8"))) for (const g of s.g) for (const [c] of g.d) known.add(c);

const lines = new TextDecoder("euc-kr").decode(fs.readFileSync(file)).split(/\r?\n/).slice(1).filter(Boolean);
const dongs = new Map();
let unread = 0;
for (const l of lines) {
  const m = l.match(/^(\d{10})\s+(.*?)\s+(\d{10})\s+(.*?)\s+(\d{8})\s*(\d{8})?\s*$/);
  if (!m) { unread++; continue; }
  const [, hCode, hName, bCode, , , ended] = m;
  // 시·군·구 전체 줄, 말소, 출장소, 리 단위, 우리 목록에 없는 법정동은 뺀다
  if (ended || hCode.slice(5) === "00000" || hName.includes("출장소") || !bCode.endsWith("00") || !known.has(bCode)) continue;
  const name = hName.trim().split(/\s+/).pop();
  if (!dongs.has(hCode)) dongs.set(hCode, { name, codes: new Set() });
  dongs.get(hCode).codes.add(bCode);
}
const rows = [...dongs.values()].map((d) => [d.name, [...d.codes]]);
if (unread || rows.length < 3000) {
  console.error(`자료 모양이 예상과 달라요: 못 읽은 줄 ${unread}, 행정동 ${rows.length}`);
  process.exit(1);
}
fs.writeFileSync(path.join(root, "public/admin-dongs.json"), JSON.stringify({ asOf, rows }));
console.log(`행정동 ${rows.length}개 저장, 기준일 ${asOf}`);
