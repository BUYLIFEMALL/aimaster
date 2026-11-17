#!/usr/bin/env node
// RE-20261117-07 후보 C 개발 자료 계산(분석 전용). 운영 DB·외부 호출 없음 — 로컬 표본 파일만 읽는다.
// 사용: node --no-warnings c-measure.mjs <설계표본.json> <2차표본.json>
//   표본 파일은 RE-20261117-06 n1-measure.mjs --fetch로 만든 것(기사 원문은 저장소에 커밋하지 않음).
//   라벨은 RE-20261117-06 labels.json(설계 98)·labels-validation.json(2차 139)을 읽기만 한다.
// 주의: 두 표본 모두 이미 규칙 개발에 쓴 자료다. 여기 수치는 개발 자료 수치이며 검증 결과가 아니다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decideC } from "./c-candidate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const prev = path.resolve(here, "../RE-20261117-06-CC-REALTY-01");
const [designFile, secondFile] = process.argv.slice(2);
if (!designFile || !secondFile) { console.error("사용: c-measure.mjs <설계표본.json> <2차표본.json>"); process.exit(2); }

// B′ 판정은 고정본 n1-measure.mjs와 같은 식을 쓰기 위해, 그 파일의 낱말표를 문자열로 읽어 함께 비교한다(파일 수정 없음).
const bSrc = fs.readFileSync(path.join(prev, "n1-measure.mjs"), "utf8");
const pick = (name) => Function(`return ${bSrc.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\]);`))[1].replace(/\.\.\.STRONG/, "...S")}`);
const STRONG = pick("STRONG")();
const TITLE_WORDS = Function("S", `return ${bSrc.match(/const TITLE_WORDS = (\[[\s\S]*?\]);/)[1].replace("...STRONG", "...S")}`)(STRONG);
const tokens = (sgg) => { const last = sgg.split(" ").pop(); return [last, last.replace(/(구|시|군)$/, "")].filter((t) => t.length >= 2); };
function decideB(o) {
  if (TITLE_WORDS.some((w) => o.title.includes(w))) return "keep";
  const sentences = (o.snippet || "").split(/(?<=[.!?…])\s+|\.\.\./);
  return sentences.some((s) => tokens(o.sgg).some((t) => s.includes(t)) && STRONG.some((w) => s.includes(w))) ? "keep" : "drop";
}

function load(sampleFile, labelFile) {
  const labels = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(prev, labelFile), "utf8")).map((l) => [l.id8, l]));
  const rows = JSON.parse(fs.readFileSync(sampleFile, "utf8")).filter((o) => labels[o.id8]);
  return rows.map((o) => ({ ...o, label: labels[o.id8].label, C: decideC(o).decision, reason: decideC(o).reason, B: decideB(o) }));
}

const sets = [["설계 98(06 개발)", load(designFile, "labels.json")], ["2차 139(06 검증→이제 개발)", load(secondFile, "labels-validation.json")]];
sets.push(["합계 237", [...sets[0][1], ...sets[1][1]]]);

console.log("자료\t\t\t\t규칙\t유지\t제외\t관련R 잘못제외\t무관X 남음\t보류U 제외");
for (const [name, rows] of sets) {
  for (const h of ["B", "C"]) {
    const k = rows.filter((r) => r[h] === "keep").length;
    const cnt = (lab, dec) => rows.filter((r) => r.label === lab && r[h] === dec).length;
    const tot = (lab) => rows.filter((r) => r.label === lab).length;
    console.log(`${name.padEnd(24)}\t${h === "B" ? "B′" : "C"}\t${k}\t${rows.length - k}\t${cnt("R", "drop")}/${tot("R")}\t\t${cnt("X", "keep")}/${tot("X")}\t\t${cnt("U", "drop")}/${tot("U")}`);
  }
}
const all = sets[2][1];
console.log("\n[C 잘못 제외(R→drop)]");
for (const r of all.filter((r) => r.label === "R" && r.C === "drop")) console.log(`  ${r.id8} ${r.sgg} ${r.title}`);
console.log("\n[C 보류 제외(U→drop)]");
for (const r of all.filter((r) => r.label === "U" && r.C === "drop")) console.log(`  ${r.id8} ${r.sgg} ${r.title}`);
console.log("\n[C 무관 남음 — 남은 이유별 건수]");
const why = {};
for (const r of all.filter((r) => r.label === "X" && r.C === "keep")) why[r.reason] = (why[r.reason] || 0) + 1;
console.log(" ", JSON.stringify(why));
console.log("\n[B′ 대비 바뀐 판정]");
for (const r of all.filter((r) => r.B !== r.C)) console.log(`  ${r.label} B′=${r.B} C=${r.C} ${r.sgg} ${r.title.slice(0, 40)}`);
