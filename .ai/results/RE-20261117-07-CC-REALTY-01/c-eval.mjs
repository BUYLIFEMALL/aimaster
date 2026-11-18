#!/usr/bin/env node
// RE-20261117-07 후보 C 독립 평가(평가 전용) — 고정 c-candidate.mjs를 바꾸지 않고 불러 쓴다. 운영 DB·외부 호출 없음.
// 사용: node --no-warnings c-eval.mjs <표본.json> <라벨.json>
//   표본은 ../RE-20261117-06-CC-REALTY-01/n1-measure.mjs --fetch 로 받은 로컬 파일(기사 원문은 커밋하지 않음).
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decideC } from "./c-candidate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const FROZEN = "797f4322922a126b232e4904fb240b395a103228b35f41d7a93b267f12887fe1";
const actual = crypto.createHash("sha256").update(fs.readFileSync(path.join(here, "c-candidate.mjs"))).digest("hex");
if (actual !== FROZEN) { console.error(`c-candidate.mjs 해시가 고정값과 다릅니다: ${actual}`); process.exit(1); }

const [sampleFile, labelFile] = process.argv.slice(2);
const labels = Object.fromEntries(JSON.parse(fs.readFileSync(labelFile, "utf8")).map((l) => [l.id8, l]));
const rows = JSON.parse(fs.readFileSync(sampleFile, "utf8")).map((o) => ({ ...o, label: labels[o.id8]?.label, ...decideC(o) }));
const missing = rows.filter((r) => !r.label);
if (missing.length) { console.error(`라벨 없는 기사 ${missing.length}건`); process.exit(1); }

const regions = [...new Set(rows.map((r) => r.sgg))];
console.log("지역\t\t전체\t유지\t제외\t관련R 잘못제외\t무관X 남음\t보류U 제외");
for (const g of [...regions, "합계"]) {
  const rs = g === "합계" ? rows : rows.filter((r) => r.sgg === g);
  const n = (lab, dec) => rs.filter((r) => r.label === lab && r.decision === dec).length;
  const t = (lab) => rs.filter((r) => r.label === lab).length;
  const k = rs.filter((r) => r.decision === "keep").length;
  console.log(`${g.padEnd(10)}\t${rs.length}\t${k}\t${rs.length - k}\t${n("R", "drop")}/${t("R")}\t\t${n("X", "keep")}/${t("X")}\t\t${n("U", "drop")}/${t("U")}`);
}
for (const r of rows.filter((r) => r.decision === "drop")) console.log(`  제외 [${r.label}] ${r.sgg} · ${r.reason}`);
for (const r of rows.filter((r) => r.label === "X" && r.decision === "keep")) console.log(`  무관 남음 ${r.sgg} · ${r.reason}`);
