// 임장 노트 주소 자동 등록용 격자 파일을 만들고(선택) 운영 Supabase Storage 공개 읽기 버킷에 올린다.
// 원본: 행정안전부 「도로명주소 위치정보요약DB」 전체분(시도별 entrc_*.txt, EUC-KR, | 구분 18칸, 좌표 UTM-K). 공공데이터라 회원 개인정보가 없다.
// 사용: node scripts/build-geo-address.mjs <전체분.zip> <출력 폴더> [--upload]
//   --upload: 루트 .env.local 서버 키로 버킷 geo-address에 v1/<격자>.json.gz를 덮어쓴다(키는 출력하지 않는다). 매달 새 전체분을 받으면 다시 돌린다.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { tileKey, utmkToWgs } from "../src/lib/onsite/geo.ts";

const [zipPath, outDir] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const upload = process.argv.includes("--upload");
if (!zipPath || !outDir) throw new Error("사용: node scripts/build-geo-address.mjs <전체분.zip> <출력 폴더> [--upload]");

const BUCKET = "geo-address";
const PREFIX = "v1";
const SUPABASE_URL = "https://esgxyikcnnvmlhygjkth.supabase.co"; // ① AIMaster 운영 DB

/** zip 안 시도별 파일을 하나씩 풀어 돌려준다(라이브러리 없이 중앙 디렉터리를 읽는다) */
function* zipEntries(file) {
  const b = fs.readFileSync(file);
  let end = b.length - 22;
  while (b.readUInt32LE(end) !== 0x06054b50) end--;
  let p = b.readUInt32LE(end + 16);
  for (let i = 0, n = b.readUInt16LE(end + 10); i < n; i++) {
    const method = b.readUInt16LE(p + 10), size = b.readUInt32LE(p + 20), nameLen = b.readUInt16LE(p + 28);
    const extraLen = b.readUInt16LE(p + 30), commentLen = b.readUInt16LE(p + 32), at = b.readUInt32LE(p + 42);
    const name = b.slice(p + 46, p + 46 + nameLen).toString("latin1");
    p += 46 + nameLen + extraLen + commentLen;
    if (!/^entrc_.*\.txt$/.test(name)) continue;
    const start = at + 30 + b.readUInt16LE(at + 26) + b.readUInt16LE(at + 28);
    const data = b.slice(start, start + size);
    yield [name, method === 8 ? zlib.inflateRawSync(data) : data];
  }
}

const tiles = new Map();
const decoder = new TextDecoder("euc-kr");
let rows = 0, noCoord = 0, noUse = 0;
for (const [name, buf] of zipEntries(zipPath)) {
  for (const line of decoder.decode(buf).split(/\r?\n/)) {
    const c = line.split("|");
    if (c.length < 18) continue;
    if (!c[16] || !c[17]) { noCoord++; continue; }
    if (!c[13]) { noUse++; continue; } // 용도가 빈 줄은 가로판매대 같은 작은 시설이라 주소로 쓰지 않는다(서울 0.5%)
    const [lat, lon] = utmkToWgs(Number(c[16]), Number(c[17]));
    const key = tileKey(lat, lon);
    if (!tiles.has(key)) tiles.set(key, []);
    tiles.get(key).push([Math.round(lat * 1e5), Math.round(lon * 1e5), c[3], c[4], c[5], c[7], c[8], c[9], c[10], c[11], c[13], c[15]]);
    rows++;
  }
  console.log(`${name} 읽음 · 누적 ${rows}곳`);
}

fs.mkdirSync(outDir, { recursive: true });
let bytes = 0;
const files = [];
for (const [key, list] of tiles) {
  const gz = zlib.gzipSync(JSON.stringify(list), { level: 9 });
  fs.writeFileSync(path.join(outDir, `${key}.json.gz`), gz);
  files.push(key);
  bytes += gz.length;
}
console.log(`건물 ${rows}곳(좌표 없음 ${noCoord}, 용도 없음 ${noUse}) · 격자 ${files.length}개 · 압축 ${(bytes / 1e6).toFixed(1)}MB → ${outDir}`);

if (upload) {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const env = fs.readFileSync(path.join(root, ".env.local"), "utf8");
  const m = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m) || env.match(/^SUPABASE_SECRET_KEY=(.*)$/m);
  if (!m) throw new Error(".env.local에 서버 키가 없습니다");
  const key = m[1].replace(/["'\r]/g, "").trim();
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  // 공개 읽기 버킷(쓰기는 서버 키만). 이미 있으면 그대로 쓴다
  const made = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 1048576 }) });
  if (!made.ok && made.status !== 409 && !/already exists/i.test(await made.text())) throw new Error(`버킷을 만들지 못했습니다(${made.status})`);
  let done = 0, failed = 0;
  const queue = [...files];
  async function worker() {
    for (let k = queue.shift(); k; k = queue.shift()) {
      const body = fs.readFileSync(path.join(outDir, `${k}.json.gz`));
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${PREFIX}/${k}.json.gz`, { method: "POST", headers: { ...headers, "Content-Type": "application/gzip", "x-upsert": "true", "Cache-Control": "max-age=86400" }, body });
        if (res.ok) { done++; break; }
        if (attempt === 2) { failed++; console.log(`실패 ${k}: ${res.status}`); }
      }
      if ((done + failed) % 2000 === 0) console.log(`올림 ${done}/${files.length}`);
    }
  }
  await Promise.all(Array.from({ length: 16 }, worker));
  console.log(`업로드 끝 · 성공 ${done} · 실패 ${failed}`);
}
