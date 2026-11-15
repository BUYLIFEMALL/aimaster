// 공용 스테이징 「맞추기 대기열」 — 2026-11-15 (Claude Code 윈도우, 주인님 지시: 「원인파악후 재발되지 않도록 조치해」)
// 배경(docs/ERROR_LESSONS.md 2026-11-15): 커밋 도우미(commit-paths·safe-commit)는 커밋 뒤 공용 스테이징(.git/index)의 내 경로를
//   새 HEAD로 맞추는데, 다른 도우미가 「맞추기 잠금」을 잡고 있으면(맥미니 SMB는 한 번에 30초~1분) 20초만 기다리고 경고 한 줄로 건너뛰었다.
//   경고는 출력 중간에 묻혀 놓치고, 그 경로는 스테이징에 커밋 전 판(MM·D)으로 남아 다른 세션의 일반 커밋이 최근 변경을 되돌릴 위험이 생겼다.
// 대책: 건너뛴 경로를 .git/aimaster-pending-sync에 적어 두고(queuePending), 다음에 어느 세션이든 잠금을 잡은 도우미가
//   그 경로를 확인해 맞춘다(healPending). 맞추는 조건은 「스테이징 판이 그 파일의 옛 커밋 판이거나(최근 이력 200개), HEAD엔 있는데
//   스테이징에서 빠진 경우」뿐 — 다른 세션이 일부러 스테이징해 둔 새 내용은 건드리지 않는다. 작업 파일은 절대 건드리지 않는다(index만).
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FILE = "aimaster-pending-sync";
const MAX_AGE_MS = 7 * 24 * 3600_000; // 일주일 넘게 맞추지 못한 줄은 버린다(안내는 세션 시작 점검이 계속 함)

/** 맞추지 못한 경로를 대기열에 적는다(한 줄 = 시각\t세션\t경로) */
export function queuePending(gitdir, paths, who = "") {
  if (!paths.length) return;
  const now = new Date().toISOString();
  appendFileSync(join(gitdir, FILE), paths.map((p) => `${now}\t${who}\t${p}\n`).join(""));
}

/** 대기열 경로를 맞춘다 — 반드시 「맞추기 잠금」을 잡은 상태에서 부른다. 돌려줌: { fixed: [...], kept: [...] } */
export function healPending(root, gitdir) {
  const f = join(gitdir, FILE);
  if (!existsSync(f)) return { fixed: [], kept: [] };
  const git = (args) => { try { return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 }); } catch { return null; } };
  const lines = readFileSync(f, "utf8").split("\n").filter(Boolean);
  const latest = new Map(); // 경로 → 줄(같은 경로는 마지막 줄만)
  for (const l of lines) { const [t, who, p] = l.split("\t"); if (p) latest.set(p, { t, who, p }); }
  const fixed = [], kept = [];
  for (const { t, who, p } of latest.values()) {
    const head = (git(["ls-tree", "HEAD", "--", p]) ?? "").split(/\s+/)[2] ?? "";
    const staged = (git(["ls-files", "-s", "--", p]) ?? "").split(/\s+/)[1] ?? "";
    if (staged === head) continue; // 이미 맞음(누가 맞췄거나 둘 다 없음) → 대기열에서 뺌
    const history = new Set((git(["log", "-200", "--no-abbrev", "--format=", "--raw", "--", p]) ?? "").split("\n").map((l) => l.split(/\s+/)[3]).filter(Boolean));
    const stale = (head && !staged) || (staged && history.has(staged)) || (!head && staged && history.has(staged));
    if (stale && git(["reset", "-q", "HEAD", "--", p]) !== null) { fixed.push(p); continue; }
    if (Date.now() - Date.parse(t) < MAX_AGE_MS) kept.push(`${t}\t${who}\t${p}`); // 일부러 스테이징한 새 내용이거나 실패 → 남겨 둠
  }
  writeFileSync(f, kept.map((l) => l + "\n").join(""));
  return { fixed, kept: kept.map((l) => l.split("\t")[2]) };
}
