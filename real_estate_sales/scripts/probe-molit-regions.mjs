// 국토부 실거래 API가 전국 지역 코드에 응답하는지, 유형별 응답 칸이 무엇인지 확인한다(2026-10-31, 읽기만).
// 사용: node --experimental-strip-types scripts/probe-molit-regions.mjs <키 파일 경로> [달 yyyymm]
// 키 값은 출력하지 않는다.
import { readFileSync } from "node:fs";
import { ALL_DISTRICTS, SIDO_GROUPS, isSeoulDistrict } from "../src/lib/publicdata/districts.ts";

const keyFile = process.argv[2];
if (!keyFile) throw new Error("키 파일 경로가 필요합니다");
const key = readFileSync(keyFile, "utf8").trim();
const kst = new Date(Date.now() + 9 * 3600e3);
const prev = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - 1, 1));
const ymd = process.argv[3] ?? `${prev.getUTCFullYear()}${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;

const hide = (s) => String(s).split(key).join("***").replace(/s+/g, " ");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(service, sgg, month = ymd) {
  const qs = new URLSearchParams({ serviceKey: key, LAWD_CD: sgg, DEAL_YMD: month, numOfRows: "5", pageNo: "1", _type: "json" });
  const res = await fetch(`https://apis.data.go.kr/1613000/RTMSDataSvc${service}/getRTMSDataSvc${service}?${qs}`);
  const text = await res.text();
  if (!res.ok) return { status: res.status, error: hide(text).slice(0, 220) };
  try {
    const body = JSON.parse(text)?.response?.body;
    const item = body?.items?.item;
    const first = Array.isArray(item) ? item[0] : item;
    return { status: 200, total: Number(body?.totalCount ?? 0), first };
  } catch {
    return { status: 200, error: hide(text).slice(0, 220) };
  }
}

console.log(`기준 달 ${ymd}`);
console.log("== 유형별 응답 칸(고양시 일산동구)");
for (const s of ["AptTrade", "RHTrade", "OffiTrade", "AptRent", "RHRent", "OffiRent"]) {
  const r = await call(s, "41285");
  console.log(s, r.status, r.total ?? "", r.error ?? "", r.first ? Object.keys(r.first).join(",") : "");
  if (r.first) console.log("  예:", JSON.stringify({ ...r.first, jibun: r.first.jibun }).slice(0, 260));
}

const targets = ALL_DISTRICTS.filter((d) => !isSeoulDistrict(d.sgg_cd));
const results = [];
let next = 0;
await Promise.all(Array.from({ length: 1 }, async () => {
  while (next < targets.length) {
    const d = targets[next++];
    await sleep(350);
    let r = await call("AptTrade", d.sgg_cd);
    if (r.status === 429) { await sleep(5000); r = await call("AptTrade", d.sgg_cd); }
    results.push({ ...d, r });
  }
}));
console.log(`== 아파트 매매 전 지역 ${results.length}곳`);
const sidoOf = (c) => SIDO_GROUPS.find((g) => g.districts.some((d) => d.sgg_cd === c))?.sido;
const by = {};
for (const x of results) {
  const a = (by[sidoOf(x.sgg_cd)] ??= { 지역: 0, 오류: 0, 자료없음: 0, 거래합계: 0 });
  a.지역++;
  if (x.r.status !== 200 || x.r.error) a.오류++;
  else if (!x.r.total) a.자료없음++;
  a.거래합계 += x.r.total ?? 0;
}
console.table(by);
for (const x of results) if (x.r.status !== 200 || x.r.error || !x.r.total) console.log("확인 필요", x.sgg_cd, sidoOf(x.sgg_cd), x.sgg_nm, x.r.status, x.r.total ?? "", x.r.error ?? "");

console.log("== 전남광주 옛 코드 대조");
for (const c of ["29110", "29170", "46110", "46130"]) {
  const r = await call("AptTrade", c);
  console.log(c, r.status, r.total ?? "", r.error ?? "");
}
