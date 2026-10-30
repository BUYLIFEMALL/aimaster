// 기존 실거래 줄의 공시가를 면적·층 맞추기 규칙으로 다시 계산한다(2026-10-31 주인님 승인, v1.29 규칙과 같음).
// 잘못 저장된 경기 필지 번호(14자리)는 같은 지역·동·단지의 정상 번호가 있을 때만 고친다(지번이 저장돼 있지 않음).
// 사용: VWORLD_KEY=<키> node --experimental-strip-types scripts/repair-assessed-prices.mjs --backup <파일> [--limit N] [--apply]
//       --apply가 없으면 쓰지 않고 통계만 보여 준다. 조회 오류가 난 줄과 조회 결과가 없는 줄은 건드리지 않는다.
import { readFileSync, writeFileSync } from "node:fs";
import { pickAssessedPrice } from "../src/lib/publicdata/molit.ts";

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const apply = args.includes("--apply");
const limit = Number(opt("--limit") ?? 0);
const backup = opt("--backup");
const key = process.env.VWORLD_KEY;
if (!key || !backup) throw new Error("VWORLD_KEY 환경변수와 --backup 파일이 필요합니다");

const env = {};
for (const line of readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_0-9]+)\s*=\s*"?([^"\r]*)"?/);
  if (m && !env[m[1]]) env[m[1]] = m[2];
}
const base = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: secret, Authorization: `Bearer ${secret}` };

let rows = [];
for (let offset = 0; ; offset += 1000) {
  const res = await fetch(`${base}/rest/v1/real_estate_listings?select=id,sgg_cd,stdg_nm,bldg_nm,floor,building_area,exclusive_area,pnu,official_price,collected_at&order=id&limit=1000&offset=${offset}`, { headers });
  const page = await res.json();
  if (!Array.isArray(page)) throw new Error(JSON.stringify(page));
  rows = rows.concat(page);
  if (page.length < 1000) break;
}
writeFileSync(backup, JSON.stringify(rows.map(({ id, pnu, official_price, exclusive_area }) => ({ id, pnu, official_price, exclusive_area }))));
console.log(`전체 ${rows.length}줄, 백업 저장`);

// 같은 단지의 정상 필지 번호 표
const goodPnu = new Map();
for (const r of rows) if (r.pnu?.length === 19) goodPnu.set(`${r.sgg_cd}|${r.stdg_nm}|${r.bldg_nm}`, r.pnu);
const fixedPnu = (r) => (r.pnu?.length === 19 ? r.pnu : goodPnu.get(`${r.sgg_cd}|${r.stdg_nm}|${r.bldg_nm}`) ?? null);

const targets = limit ? rows.filter((_, i) => i % Math.ceil(rows.length / limit) === 0).slice(0, limit) : rows;

// 같은 필지·연도는 한 번만 조회
const cache = new Map();
let calls = 0;
function lookup(pnu, year) {
  const k = `${pnu}|${year}`;
  if (!cache.has(k)) {
    cache.set(k, (async () => {
      calls++;
      const qs = new URLSearchParams({ pnu, stdrYear: String(year), format: "json", numOfRows: "1000", pageNo: "1", key, domain: "real-estate-sales.buylife.xyz" });
      const res = await fetch(`https://api.vworld.kr/ned/data/getApartHousingPriceAttr?${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.response?.error || json?.response?.resultCode?.includes?.("INCORRECT")) throw new Error("VWorld 오류");
      if (json?.response?.resultCode && json.response.resultCode !== "" && json.response.resultCode !== "NOT_FOUND") throw new Error(json.response.resultCode);
      return json?.apartHousingPrices?.field ?? [];
    })());
  }
  return cache.get(k);
}

const stat = { 면적고침: 0, 그대로: 0, 값변경: 0, 비움: 0, 새로채움: 0, 조회결과없음: 0, 오류: 0, 필지고침: 0, 필지못고침: 0, 저장실패: 0 };
const samples = [];
let next = 0;
async function worker() {
  while (next < targets.length) {
    const r = targets[next++];
    const patch = {};
    if (r.building_area !== null && Number(r.exclusive_area) !== Number(r.building_area)) { patch.exclusive_area = r.building_area; stat.면적고침++; }
    const pnu = fixedPnu(r);
    if (!pnu) stat.필지못고침++;
    if (pnu && pnu !== r.pnu) { patch.pnu = pnu; stat.필지고침++; }
    if (pnu) try {
      const found = await lookup(pnu, new Date(r.collected_at).getFullYear() - 1);
      if (found.length === 0) stat.조회결과없음++;
      else {
        const price = pickAssessedPrice(found, r.building_area, r.floor);
        const old = r.official_price === null ? null : Number(r.official_price);
        if (price === old) stat.그대로++;
        else {
          patch.official_price = price;
          if (price === null) stat.비움++;
          else if (old === null) stat.새로채움++;
          else stat.값변경++;
          if (samples.length < 12) samples.push([r.bldg_nm, r.building_area, r.floor, old, price]);
        }
      }
    } catch (e) {
      stat.오류++;
      if (stat.오류 <= 3) console.log("조회 오류:", String(e.message).slice(0, 120));
    }
    if (apply && Object.keys(patch).length) {
      const res = await fetch(`${base}/rest/v1/real_estate_listings?id=eq.${r.id}`, { method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      if (!res.ok) { stat.저장실패++; console.log("저장 실패", res.status); }
    }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log(apply ? "적용함" : "시험 실행(쓰지 않음)", `대상 ${targets.length}줄, 브이월드 호출 ${calls}회`);
console.log(stat);
console.log("예시 [단지, 면적, 층, 이전, 새 값]", JSON.stringify(samples));
