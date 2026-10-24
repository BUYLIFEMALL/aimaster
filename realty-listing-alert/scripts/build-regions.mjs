// 지역 고르기용 목록 만들기 (2026-10-25, 지역 감시 §7).
// 원본: 국토교통부 「전국 법정동」 CSV(공공데이터포털 15063424, 2026-06-30 기준, 이용 제한 없음) — 저장소에는 넣지 않고 결과 JSON만 넣는다.
// 네이버 부동산 지역 번호(cortarNo)는 법정동 코드 10자리와 같은 형식(0단계 사전 검증: 백석동 4128510600).
// 사용: node scripts/build-regions.mjs <법정동 CSV 경로>  →  public/regions.json
// 모양: [{ c: "11", n: "서울특별시", g: [{ c: "11110", n: "종로구", d: [["1111010100", "청운동"], …] }] }]
// 리(里)는 빼고 읍·면·동까지만, 읍·면·동이 하나도 없는 시·군·구(예: 일반구를 가진 「고양시」)는 뺀다.
import { readFileSync, writeFileSync } from "node:fs";

const src = process.argv[2];
if (!src) throw new Error("사용: node scripts/build-regions.mjs <법정동 CSV 경로>");
const lines = readFileSync(src, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
const head = lines.shift().split(",");
const col = (name) => head.indexOf(name);
const [iCode, iSido, iSgg, iEmd, iRi] = ["법정동코드", "시도명", "시군구명", "읍면동명", "리명"].map(col);
if ([iCode, iSido, iSgg, iEmd, iRi].some((i) => i < 0)) throw new Error(`칸 이름이 예상과 다릅니다: ${head.join(",")}`);

const sido = new Map();
const sgg = new Map();
for (const line of lines) {
  const f = line.split(",");
  const code = f[iCode];
  if (!/^\d{10}$/.test(code)) continue;
  if (code.endsWith("00000000")) sido.set(code.slice(0, 2), { c: code.slice(0, 2), n: f[iSido], g: [] });
  // 「고양시일산동구」처럼 시+구가 붙은 이름은 「고양시 일산동구」로 띄운다
  else if (code.endsWith("00000")) sgg.set(code.slice(0, 5), { c: code.slice(0, 5), n: f[iSgg].replace(/^(.+?시)(.+구)$/, "$1 $2"), d: [] });
  else if (!f[iRi] && f[iEmd]) {
    const g = sgg.get(code.slice(0, 5));
    if (g) g.d.push([code, f[iEmd]]);
  }
}
for (const g of sgg.values()) {
  if (!g.d.length) continue;
  g.d.sort((a, b) => a[0].localeCompare(b[0]));
  sido.get(g.c.slice(0, 2))?.g.push(g);
}
const out = [...sido.values()].filter((s) => s.g.length).sort((a, b) => a.c.localeCompare(b.c));
for (const s of out) s.g.sort((a, b) => a.c.localeCompare(b.c));
writeFileSync(new URL("../public/regions.json", import.meta.url), JSON.stringify(out));
const dongs = out.reduce((n, s) => n + s.g.reduce((m, g) => m + g.d.length, 0), 0);
console.log(`시도 ${out.length} · 시군구 ${out.reduce((n, s) => n + s.g.length, 0)} · 읍면동 ${dongs}`);
