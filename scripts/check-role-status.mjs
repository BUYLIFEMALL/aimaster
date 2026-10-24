#!/usr/bin/env node
// 역할 현황·작업 중 표 정리 점검 — 2026-10-24 (Claude Code 윈도우 `claude-win-dotori`, 주인님 승인 「정리 점검 도구 … 진행해」)
// 읽기만 한다(파일·git을 바꾸지 않음). 플랜: docs/PLAN_20261024_ADMIN_DEV_DOCS_CENTER.md, 규칙: docs/roles/README.md
// 확인하는 것:
//  1) docs/roles/<역할 ID>.md — 「마지막 갱신」이 3일 넘게 지났거나, 아직 초안이거나, 담당 세션이 그 뒤에 커밋했는데 파일을 안 고친 경우
//  2) docs/ACTIVE_WORK.md 「작업 중」 표 — 종료라고 적힌 줄, 24시간 넘은 줄(그 폴더에 미커밋 변경이 없으면), 그 세션의 최근 커밋이 없는 줄, [역할: …] 표시가 없는 줄
// 사용: node scripts/check-role-status.mjs [--days 3] [--json]
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const DAYS = Number(args[args.indexOf("--days") + 1]) || 3;
const asJson = args.includes("--json");
const NOW = Date.now();
const DAY = 86400000;

const git = (a) => {
  try { return execFileSync("git", a, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return ""; }
};
const parseDate = (s) => {
  const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0).getTime();
};
const ago = (t) => (t == null ? "알 수 없음" : `${Math.floor((NOW - t) / DAY)}일 ${Math.floor(((NOW - t) % DAY) / 3600000)}시간 전`);

// 최근 14일 커밋의 세션별 마지막 시각 (커밋 메시지 끝 `AIMaster-Session: <이름>`)
const lastCommit = new Map();
for (const rec of git(["log", "--since=14.days", "--format=%ct%x00%B%x01"]).split("\x01")) {
  const [ts, body = ""] = rec.split("\x00");
  const t = Number(ts.trim()) * 1000;
  for (const m of body.matchAll(/AIMaster-Session:\s*([\w.-]+)/g)) {
    if (!lastCommit.has(m[1]) || lastCommit.get(m[1]) < t) lastCommit.set(m[1], t);
  }
}

// 1) 역할 파일
const rolesDir = join(ROOT, "docs", "roles");
const roles = [];
if (existsSync(rolesDir)) {
  for (const f of readdirSync(rolesDir).filter((f) => f.endsWith(".md") && f !== "README.md" && !f.startsWith("_"))) {
    const text = readFileSync(join(rolesDir, f), "utf8");
    const id = f.replace(/\.md$/, "");
    const updLine = (text.match(/^- 마지막 갱신:\s*(.+)$/m) || [])[1] || "";
    const owner = (text.match(/^- 담당:\s*(.+)$/m) || [])[1] || "";
    const sessions = [...owner.matchAll(/`([\w.-]+)`/g)].map((m) => m[1]);
    const updated = parseDate(updLine);
    const issues = [];
    if (updated == null) issues.push("「마지막 갱신」 날짜를 읽을 수 없음");
    else if (NOW - updated > DAYS * DAY) issues.push(`${DAYS}일 넘게 갱신 안 됨(${ago(updated)})`);
    if (/초안/.test(updLine)) issues.push("아직 초안 — 담당 세션의 확인 전");
    if (!sessions.length || /확인 필요/.test(owner)) issues.push("담당 세션 이름 확인 필요");
    // 담당 세션의 마지막 커밋이 이 역할 파일의 마지막 커밋보다 2시간 넘게 뒤면 → 일을 했는데 현황을 안 고친 것
    const latest = Math.max(0, ...sessions.map((s) => lastCommit.get(s) || 0));
    const fileCommit = Number(git(["log", "-1", "--format=%ct", "--", `docs/roles/${f}`]).trim()) * 1000 || 0;
    if (latest && fileCommit && latest > fileCommit + 2 * 3600000) issues.push(`담당 세션이 역할 파일보다 나중에 커밋함(${ago(latest)}) — 역할 파일 갱신 필요`);
    roles.push({ id, owner, updated: updLine, lastCommit: latest ? new Date(latest).toISOString() : null, issues });
  }
}

// 2) 작업 중 표
const aw = existsSync(join(ROOT, "docs", "ACTIVE_WORK.md")) ? readFileSync(join(ROOT, "docs", "ACTIVE_WORK.md"), "utf8") : "";
const section = aw.split(/^## 작업 중\s*$/m)[1]?.split(/^## /m)[0] || "";
const rows = [];
for (const line of section.split(/\r?\n/)) {
  if (!line.startsWith("|") || /^\|\s*(폴더|---)/.test(line)) continue;
  const cells = line.split("|").slice(1, -1).map((c) => c.trim());
  if (cells.length < 4) continue;
  const [folderCell, agentCell, startCell, workCell] = cells;
  const sessions = [...agentCell.matchAll(/세션\s*`([\w.-]+)`/g)].map((m) => m[1]);
  const folders = [...folderCell.matchAll(/`([^`]+\/)`/g)].map((m) => m[1]);
  const started = parseDate(startCell);
  const issues = [];
  if (/종료/.test(agentCell + workCell)) issues.push("「종료」라고 적힌 줄 — 정리 대상(지우기 전에 주인님께 확인)");
  if (!/\[역할:/.test(agentCell)) issues.push("[역할: …] 표시 없음");
  if (started != null && NOW - started > DAY) {
    const dirty = folders.length ? git(["status", "--porcelain", "--", ...folders]).trim() : "";
    if (!dirty) issues.push(`24시간 넘음(${ago(started)}) + 그 폴더에 미커밋 변경 없음 — 끝났는지 주인님께 확인`);
  }
  const latest = Math.max(0, ...sessions.map((s) => lastCommit.get(s) || 0));
  if (sessions.length && !latest) issues.push("이 세션의 최근 14일 커밋 없음");
  rows.push({ folders: folderCell.slice(0, 80), sessions, start: startCell, lastCommit: latest ? new Date(latest).toISOString() : null, issues });
}

if (asJson) {
  console.log(JSON.stringify({ checkedAt: new Date(NOW).toISOString(), days: DAYS, roles, activeWork: rows }, null, 2));
  process.exit(0);
}

console.log(`역할 현황 점검 — ${new Date(NOW).toLocaleString("ko-KR")} (기준: ${DAYS}일)\n`);
console.log("■ 역할 파일 (docs/roles/)");
for (const r of roles) {
  console.log(`  ${r.issues.length ? "⚠" : "✔"} ${r.id.padEnd(18)} 마지막 갱신: ${r.updated.slice(0, 40) || "없음"}`);
  for (const i of r.issues) console.log(`      - ${i}`);
}
console.log("\n■ 작업 중 표 (docs/ACTIVE_WORK.md)");
if (!rows.length) console.log("  (작업 중인 줄 없음)");
for (const r of rows) {
  console.log(`  ${r.issues.length ? "⚠" : "✔"} ${r.sessions.join(", ") || "(세션 이름 없음)"} — ${r.folders}`);
  for (const i of r.issues) console.log(`      - ${i}`);
}
const n = roles.filter((r) => r.issues.length).length + rows.filter((r) => r.issues.length).length;
console.log(`\n확인할 항목 ${n}개. 이 도구는 읽기만 합니다 — 고치는 것은 각 담당 세션이 자기 파일에서 합니다.`);
