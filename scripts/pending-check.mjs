#!/usr/bin/env node
// 배포 전 「미배포 대기」 확인 — 2026-10-23 (Claude Code 윈도우)
// 사용: node scripts/pending-check.mjs <폴더> [<폴더> ...]   예) node scripts/pending-check.mjs shots thumbnail-master
//       node scripts/pending-check.mjs --all                 프로그램별 대기 개수
// 읽는 곳: docs/PENDING_DEPLOYS.md 「대기 중」 표(프로그램 자체의 작은 수정) + docs/SHARED_MODULES.md 「미배포 사본」 표(공용 기준 코드 사본).
// 읽기만 하고 아무것도 바꾸지 않는다. 배포가 끝나면 지침대로 두 표의 해당 줄을 직접 정리한다(docs/VERCEL_COST_REDUCTION_PLAN.md 맨 위).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");

/** 「## 제목」 아래부터 다음 「## 」 전까지의 표 줄(머리·구분 줄 제외) */
function tableRows(md, heading) {
  const start = md.indexOf(`\n## ${heading}`);
  if (start < 0) return [];
  const rest = md.slice(start + 1);
  const next = rest.indexOf("\n## ");
  const body = next < 0 ? rest : rest.slice(0, next);
  const rows = body.split("\n").filter((l) => l.startsWith("|") && !/^\|\s*-/.test(l));
  return rows.slice(1); // 첫 줄은 머리
}

const cells = (row) => row.split("|").slice(1, -1).map((c) => c.trim());
const short = (s, n = 140) => (s.length > n ? `${s.slice(0, n)}…` : s);

const pending = tableRows(read("docs/PENDING_DEPLOYS.md"), "대기 중").map((row) => {
  const c = cells(row);
  const name = (c[0].match(/`([^`]+)`/) || [])[1] ?? c[0];
  return { name, what: c[1] ?? "", commit: c[2] ?? "", where: c[4] ?? "", next: c[5] ?? "" };
});

// 「아직 배포 안 된 프로그램」 칸에서 취소선(~~…~~)이 아닌 `폴더` 이름들
const shared = tableRows(read("docs/SHARED_MODULES.md"), "미배포 사본").map((row) => {
  const c = cells(row);
  const col = (c[1] ?? "").replace(/~~[^~]*~~/g, "");
  const names = [...col.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  return { change: c[0] ?? "", names, note: c[2] ?? "" };
});

const args = process.argv.slice(2);
if (!args.length) {
  console.log("사용: node scripts/pending-check.mjs <폴더> [<폴더> ...]  |  --all");
  process.exit(0);
}

if (args.includes("--all")) {
  const count = new Map();
  for (const p of pending) count.set(p.name, (count.get(p.name) ?? 0) + 1);
  console.log(`[미배포 대기 — docs/PENDING_DEPLOYS.md] ${pending.length}줄, 프로그램 ${count.size}개`);
  for (const [n, k] of [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) console.log(`  ${n}: ${k}`);
  const sharedNames = new Map();
  for (const s of shared) for (const n of s.names) sharedNames.set(n, (sharedNames.get(n) ?? 0) + 1);
  console.log(`[미배포 사본 — docs/SHARED_MODULES.md] 이름이 걸린 프로그램 ${sharedNames.size}개(표 비고에 ✅가 있으면 이미 배포된 줄일 수 있음 — 원문 확인)`);
  process.exit(0);
}

for (const folder of args) {
  const mine = pending.filter((p) => p.name === folder);
  const copies = shared.filter((s) => s.names.includes(folder));
  console.log(`\n=== ${folder} ===`);
  if (!mine.length && !copies.length) { console.log("  대기 없음"); continue; }
  for (const p of mine) {
    console.log(`  • [대기] ${short(p.what)}  ${p.commit}`);
    if (p.where) console.log(`      상세: ${short(p.where, 120)}`);
    if (p.next) console.log(`      배포 때: ${short(p.next, 120)}`);
  }
  for (const s of copies) console.log(`  • [공용 사본] ${short(s.change)}\n      비고: ${short(s.note, 120)}`);
  console.log("  → 배포가 끝나면 docs/PENDING_DEPLOYS.md 줄을 「내보낸 기록」으로 옮기고, 공용 사본 표·프로그램 폴더의 대기 표시도 정리하세요.");
}
