#!/usr/bin/env node
// 공용 문서 「되돌림」 경고 — 2026-10-23 (Claude Code 윈도우, docs/PROPOSAL_20261023_SHARED_DOC_OVERWRITE.md 방안 B)
// 이번 커밋(스테이징)이 공용 문서에서 지우는 줄 가운데 「최근 2시간 안 다른 커밋이 넣은 줄」이 있으면 경고만 한다(커밋은 막지 않음).
// 흔한 원인: 파일을 읽은 뒤 몇 분 지나 커밋하는 사이 다른 세션 커밋이 들어옴 → 예전 내용으로 덮어씀.
// 사용: node scripts/check-shared-doc-reverts.mjs --staged   (pre-commit 훅이 부름. 별도 인덱스(GIT_INDEX_FILE)로 커밋해도 그 인덱스를 본다)
import { execFileSync } from "node:child_process";

const SHARED = [
  "docs/HANDOFF.md", "docs/PENDING_DEPLOYS.md", "docs/PROGRAM_CAPABILITY_MAP.md", "docs/SHARED_MODULES.md",
  "docs/PROGRAM_IDEA_BACKLOG.md", "docs/ERROR_LESSONS.md", "docs/ACTIVE_WORK.md", "docs/VERCEL_COST_REDUCTION_PLAN.md",
  "CLAUDE.md", "AGENTS.md", "GEMINI.md", "DESIGN.md",
];
const WINDOW = "2 hours ago";
const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

let staged;
try { staged = git("diff", "--cached", "--name-only").split("\n").filter(Boolean); } catch { process.exit(0); }
const targets = staged.filter((f) => SHARED.includes(f));
if (!targets.length) process.exit(0);

const warnings = [];
for (const file of targets) {
  // 이번 커밋이 지우는 줄(빈 줄·아주 짧은 줄 제외)
  const removed = git("diff", "--cached", "-U0", "--", file).split("\n")
    .filter((l) => l.startsWith("-") && !l.startsWith("---")).map((l) => l.slice(1).trimEnd()).filter((l) => l.trim().length > 12);
  if (!removed.length) continue;
  // 최근 2시간 커밋이 넣은 줄
  let recent = "";
  try { recent = git("log", `--since=${WINDOW}`, "--format=", "-p", "--", file); } catch { continue; }
  const added = new Set(recent.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1).trimEnd()));
  // 같은 줄을 다시 넣는 경우(내용만 옮김)는 빼고 셈
  const readded = new Set(git("diff", "--cached", "-U0", "--", file).split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1).trimEnd()));
  const hits = removed.filter((l) => added.has(l) && !readded.has(l));
  if (hits.length) warnings.push({ file, hits });
}

if (warnings.length) {
  console.error("\n⚠ [공용 문서 되돌림 경고] 이번 커밋이 최근 2시간 안 다른 커밋이 넣은 줄을 지웁니다(커밋은 계속 진행됩니다).");
  for (const w of warnings) {
    console.error(`  • ${w.file}: ${w.hits.length}줄`);
    for (const l of w.hits.slice(0, 3)) console.error(`      - ${l.slice(0, 110)}${l.length > 110 ? "…" : ""}`);
  }
  console.error("  의도한 정리가 아니면: 최신 HEAD를 다시 읽어 「HEAD + 내 변경」만 커밋하고, 지운 줄은 다음 커밋으로 되살리세요(docs/PROPOSAL_20261023_SHARED_DOC_OVERWRITE.md).\n");
}
process.exit(0);
