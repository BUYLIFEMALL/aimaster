// legalDong.ts에 경기·인천 리(里) 코드를 넣는다(2026-10-31). 키 모양은 국토부 응답과 같은 「남양읍 남양리」.
// 원본: 국토교통부 전국 법정동 CSV(공공데이터포털 15063424) — 저장소에는 넣지 않는다.
// 사용: node scripts/build-legal-dong-ri.mjs <법정동 CSV 경로>
import { readFileSync, writeFileSync } from "node:fs";

const src = process.argv[2];
if (!src) throw new Error("사용: node scripts/build-legal-dong-ri.mjs <법정동 CSV 경로>");
const target = new URL("../src/lib/publicdata/legalDong.ts", import.meta.url);
const text = readFileSync(target, "utf8");
const m = text.match(/^(export const LEGAL_DONG[^=]*= )(\{.*\});\s*$/m);
if (!m) throw new Error("legalDong.ts 모양이 예상과 다릅니다");
const table = JSON.parse(m[2]);

const lines = readFileSync(src, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
const head = lines.shift().split(",");
const [iCode, iEmd, iRi] = ["법정동코드", "읍면동명", "리명"].map((n) => head.indexOf(n));
if ([iCode, iEmd, iRi].some((i) => i < 0)) throw new Error(`칸 이름이 예상과 다릅니다: ${head.join(",")}`);

let added = 0;
for (const line of lines) {
  const f = line.split(",");
  const code = f[iCode];
  const dongs = table[code?.slice(0, 5)];
  if (!dongs || !f[iRi] || !/^\d{10}$/.test(code)) continue;
  dongs[`${f[iEmd]} ${f[iRi]}`] = code.slice(5);
  added++;
}
writeFileSync(target, text.replace(m[2], () => JSON.stringify(table)));
console.log(`리 ${added}곳 추가`);
