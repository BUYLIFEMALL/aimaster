#!/usr/bin/env node
// 예약·발행 실행 설정 점검 (2026-10-18)
// 저장소 안의 예약/발행 실행 주소(API route)를 찾아, 각 프로그램 vercel.json에 자동 실행(cron)이
// 등록돼 있는지와 실행 주기를 표로 보여 준다. 예약 게시 주소는 5분 이하여야 통과한다.
// 배경: INSTA 포스팅은 실행 장치가 없었고 Threads 포스팅은 하루 1번만 돌던 문제(docs/PLAN_20261018_SCHEDULED_DISPATCH_MONITOR.md).
//
// 사용: node scripts/check-scheduled-dispatch.mjs [--live] [--root <폴더>]
//   --live  Vercel에 실제 등록된 cron 목록과도 대조(프로그램 폴더의 .vercel/project.json 필요, Vercel CLI 로그인 상태)
//   --root  점검할 폴더(기본: 저장소 루트). 시험용.
// 문제가 하나라도 있으면 종료 코드 1.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const rootIdx = args.indexOf("--root");
const ROOT = rootIdx >= 0 ? args[rootIdx + 1] : join(import.meta.dirname, "..");

const SKIP = new Set(["node_modules", ".next", ".git", ".vercel", "dist", "out", "KIT", "clone-kit", ".turbo", "coverage"]);
// 예약·발행 실행 주소로 보는 이름. 예약 게시(글마다 예약 시각)는 5분 이하가 필요하다.
const DISPATCH_RE = /(dispatch|generate-and-post)/;
const POSTING_RE = /(dispatch-scheduled|generate-and-post)/;
const MAX_POSTING_MINUTES = 5;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith(".")) continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, out);
    else if (name === "route.ts" || name === "route.js") out.push(full);
  }
  return out;
}

// <프로젝트>/(src/)app/.../api/.../route.ts → { project, path }
function parseRoute(file) {
  const rel = relative(ROOT, file).split(sep).join("/");
  const m = rel.match(/^(.*?)\/(?:src\/)?app\/(.*)\/route\.(ts|js)$/);
  if (!m) return null;
  const urlPath = "/" + m[2].split("/").filter((s) => !/^\(.*\)$/.test(s)).join("/");
  if (!urlPath.startsWith("/api/")) return null;
  return { project: m[1], path: urlPath };
}

// cron 식 → 대략 몇 분마다 도는지(알 수 없으면 null)
export function intervalMinutes(expr) {
  const [min, hour, dom, mon, dow] = String(expr).trim().split(/\s+/);
  if ([dom, mon, dow].some((v) => v !== "*")) return null;
  if (hour === "*") {
    if (min === "*") return 1;
    const step = min.match(/^\*\/(\d+)$/);
    if (step) return Number(step[1]);
    if (/^\d+$/.test(min)) return 60;
    return null;
  }
  const hstep = hour.match(/^\*\/(\d+)$/);
  if (hstep && /^\d+$/.test(min)) return Number(hstep[1]) * 60;
  if (/^\d+$/.test(hour) && /^\d+$/.test(min)) return 1440;
  return null;
}

function readCrons(project) {
  const f = join(ROOT, project, "vercel.json");
  if (!existsSync(f)) return { file: false, crons: [] };
  try {
    const j = JSON.parse(readFileSync(f, "utf8"));
    return { file: true, crons: (j.crons || []).map((c) => ({ path: String(c.path).split("?")[0], schedule: c.schedule })) };
  } catch {
    return { file: true, crons: [], broken: true };
  }
}

function liveCrons(project) {
  const pj = join(ROOT, project, ".vercel", "project.json");
  if (!existsSync(pj)) return { error: ".vercel/project.json 없음" };
  const name = JSON.parse(readFileSync(pj, "utf8")).projectName;
  try {
    const raw = execSync(`npx -y vercel@latest api /v9/projects/${name}`, {
      cwd: join(ROOT, project), stdio: ["ignore", "pipe", "ignore"], env: { ...process.env, MSYS_NO_PATHCONV: "1" },
    }).toString();
    const defs = JSON.parse(raw).crons?.definitions || [];
    return { crons: defs.map((d) => ({ path: String(d.path).split("?")[0], schedule: d.schedule })) };
  } catch (e) {
    return { error: "Vercel 조회 실패" };
  }
}

const routes = walk(ROOT).map(parseRoute).filter((r) => r && DISPATCH_RE.test(r.path));
routes.sort((a, b) => (a.project + a.path).localeCompare(b.project + b.path));

let problems = 0;
const rows = [];
for (const r of routes) {
  const posting = POSTING_RE.test(r.path);
  const { file, crons, broken } = readCrons(r.project);
  const hit = crons.find((c) => c.path === r.path);
  let status = "OK";
  let note = "";
  if (broken) { status = "실패"; note = "vercel.json 형식 오류"; }
  else if (!file) { status = "실패"; note = "vercel.json 없음"; }
  else if (!hit) { status = "실패"; note = "vercel.json에 이 주소 등록 없음"; }
  else {
    const m = intervalMinutes(hit.schedule);
    if (posting && (m === null || m > MAX_POSTING_MINUTES)) { status = "실패"; note = `예약 게시는 ${MAX_POSTING_MINUTES}분 이하 필요`; }
  }
  if (LIVE && status === "OK") {
    const live = liveCrons(r.project);
    if (live.error) { status = "확인 필요"; note = live.error; }
    else if (!live.crons.find((c) => c.path === r.path && c.schedule === hit.schedule)) { status = "실패"; note = "Vercel 실제 등록과 다름(배포 필요)"; }
    else note = "Vercel 등록 일치";
  }
  if (status !== "OK") problems += 1;
  rows.push({ status, project: r.project, path: r.path, schedule: hit?.schedule ?? "-", every: hit ? (intervalMinutes(hit.schedule) ?? "?") : "-", kind: posting ? "예약 게시" : "기타 실행", note });
}

console.log(`예약·발행 실행 점검 — ${rows.length}개 주소${LIVE ? " (Vercel 실제 등록 대조)" : ""}\n`);
console.log("| 결과 | 프로그램 | 주소 | 종류 | 실행 주기 | 분 | 메모 |");
console.log("|---|---|---|---|---|---|---|");
for (const x of rows) console.log(`| ${x.status} | ${x.project} | ${x.path} | ${x.kind} | ${x.schedule} | ${x.every} | ${x.note} |`);
console.log(problems ? `\n문제 ${problems}건 — 위 표의 실패·확인 필요 항목을 고쳐 주세요.` : "\n모두 통과했습니다.");
process.exit(problems ? 1 : 0);
