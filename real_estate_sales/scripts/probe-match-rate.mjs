// 표본 지역의 유형별 공시가·전월세 맞춤률을 잰다(2026-10-31, 읽기만, DB에 쓰지 않음).
// 사용: VWORLD_KEY=<키> node --experimental-strip-types scripts/probe-match-rate.mjs <국토부 키 파일 경로>
import { readFileSync } from "node:fs";
import { LEGAL_DONG } from "../src/lib/publicdata/legalDong.ts";
import { MOLIT_SERVICE, PROPERTY_TYPES, molitMonths, molitRentRows, molitRows, molitUrl, pickAssessedPrice, pickRentComparable } from "../src/lib/publicdata/molit.ts";

const key = readFileSync(process.argv[2], "utf8").trim();
const vworld = process.env.VWORLD_KEY;
const SAMPLES = [["26350", "부산 해운대구"], ["48121", "창원 의창구"], ["52720", "전북 진안군"], ["52111", "전주 완산구"], ["36110", "세종"], ["50110", "제주시"], ["12110", "전남광주 동구"], ["12710", "전남광주 군 첫 지역"], ["41591", "화성 만세구"]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function molit(service, sgg, ymd, n) {
  await sleep(400);
  const qs = new URLSearchParams({ serviceKey: key, LAWD_CD: sgg, DEAL_YMD: ymd, numOfRows: String(n), pageNo: "1", _type: "json" });
  let res = await fetch(`${molitUrl(service)}?${qs}`);
  if (res.status === 429) { await sleep(5000); res = await fetch(`${molitUrl(service)}?${qs}`); }
  if (!res.ok) return { failed: res.status };
  return res.json();
}

for (const [sgg, name] of SAMPLES) {
  for (const type of PROPERTY_TYPES) {
    const svc = MOLIT_SERVICE[type];
    const months = molitMonths(new Date(), 3);
    const trades = [];
    let failed = null;
    for (const ymd of months.slice(0, 2)) {
      const j = await molit(svc.trade, sgg, ymd, 200);
      if (j.failed) failed = j.failed; else trades.push(j);
    }
    if (failed) { console.log(name, type, "매매 호출 실패", failed); continue; }
    const rows = molitRows(trades, name, LEGAL_DONG, type).slice(0, 15);
    const rents = [];
    for (const ymd of months) {
      const j = await molit(svc.rent, sgg, ymd, 1000);
      if (!j.failed) rents.push(j);
    }
    const rentRows = molitRentRows(rents);
    let price = 0, rent = 0, codeMiss = 0;
    for (const r of rows) {
      if (!r.STDG_CD) codeMiss++;
      if (pickRentComparable(rentRows, r.BLDG_NM, r.STDG_NM, r.ARCH_AREA)) rent++;
      if (type === "오피스텔" || !r.STDG_CD) continue;
      const pnu = `${r.CGG_CD}${r.STDG_CD}${r.LOTNO_SE === "2" ? "2" : "1"}${r.MNO.padStart(4, "0")}${r.SNO.padStart(4, "0")}`;
      const qs = new URLSearchParams({ pnu, stdrYear: String(new Date().getFullYear() - 1), format: "json", numOfRows: "1000", pageNo: "1", key: vworld, domain: "real-estate-sales.buylife.xyz" });
      const j = await (await fetch(`https://api.vworld.kr/ned/data/getApartHousingPriceAttr?${qs}`)).json();
      if (pickAssessedPrice(j?.apartHousingPrices?.field ?? [], r.ARCH_AREA, r.FLR)) price++;
    }
    const sampleDong = rows[0]?.STDG_NM ?? "";
    console.log(`${name} ${type}: 표본 ${rows.length} / 공시가 ${type === "오피스텔" ? "대상 아님" : price} / 전월세 ${rent} / 동 코드 없음 ${codeMiss} / 예 ${sampleDong}`);
  }
}
