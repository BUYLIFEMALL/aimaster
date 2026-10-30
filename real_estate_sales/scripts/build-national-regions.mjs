// 전국 지역 목록과 법정동·리 코드표를 만든다(2026-10-31). 서울은 서울 열린데이터가 동 코드를 주므로 코드표에서 뺀다.
// 원본: 국토교통부 전국 법정동 CSV(공공데이터포털 15063424, 저장소에 넣지 않음) + realty-listing-alert/public/regions.json(시·군·구 이름)
// 사용: node scripts/build-national-regions.mjs <법정동 CSV 경로>
import { readFileSync, writeFileSync } from "node:fs";

const src = process.argv[2];
if (!src) throw new Error("사용: node scripts/build-national-regions.mjs <법정동 CSV 경로>");
const regions = JSON.parse(readFileSync(new URL("../../realty-listing-alert/public/regions.json", import.meta.url), "utf8"));
const SHORT = { 12: "전남광주", 26: "부산", 27: "대구", 30: "대전", 31: "울산", 36: "세종", 43: "충북", 44: "충남", 47: "경북", 48: "경남", 50: "제주", 51: "강원", 52: "전북" };

const groups = regions
  .filter((s) => SHORT[s.c])
  .map((s) => ({ sido: SHORT[s.c], districts: s.g.map((g) => ({ sgg_cd: g.c, sgg_nm: g.n })) }));
if (groups.length !== Object.keys(SHORT).length) throw new Error("시·도 수가 예상과 다릅니다");
const districtsFile = new URL("../src/lib/publicdata/districts.ts", import.meta.url);
writeFileSync(
  districtsFile,
  readFileSync(districtsFile, "utf8").replace(/^export const OTHER_SIDO_GROUPS.*$/m, () => `export const OTHER_SIDO_GROUPS: { sido: string; districts: readonly { sgg_cd: string; sgg_nm: string }[] }[] = ${JSON.stringify(groups)};`),
);

const wanted = new Set(regions.filter((s) => s.c !== "11").flatMap((s) => s.g.map((g) => g.c)));
const lines = readFileSync(src, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
const head = lines.shift().split(",");
const [iCode, iEmd, iRi] = ["법정동코드", "읍면동명", "리명"].map((n) => head.indexOf(n));
if ([iCode, iEmd, iRi].some((i) => i < 0)) throw new Error(`칸 이름이 예상과 다릅니다: ${head.join(",")}`);
const table = {};
for (const line of lines) {
  const f = line.split(",");
  const code = f[iCode];
  if (!/^\d{10}$/.test(code) || !wanted.has(code.slice(0, 5)) || !f[iEmd]) continue;
  (table[code.slice(0, 5)] ??= {})[f[iRi] ? `${f[iEmd]} ${f[iRi]}` : f[iEmd]] = code.slice(5);
}
writeFileSync(
  new URL("../src/lib/publicdata/legalDong.ts", import.meta.url),
  `// 서울 밖 법정동 이름 → 법정동 코드 뒤 5자리(2026-10-31 생성). 만드는 법: scripts/build-national-regions.mjs. 직접 고치지 않는다.\n// 국토부 실거래 API는 동 코드 없이 동 이름(umdNm, 예: 「남양읍 남양리」)만 줘서, 필지 번호(PNU)를 만들려고 이 표로 찾는다.\nexport const LEGAL_DONG: Record<string, Record<string, string>> = ${JSON.stringify(table)};\n`,
);
console.log(`시·도 ${groups.length}, 시·군·구 ${groups.reduce((n, g) => n + g.districts.length, 0)}, 코드표 시·군·구 ${Object.keys(table).length}, 줄 ${Object.values(table).reduce((n, t) => n + Object.keys(t).length, 0)}`);
