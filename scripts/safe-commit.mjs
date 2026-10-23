#!/usr/bin/env node
// 안전 커밋 도우미 — 2026-10-23 (Claude Code 윈도우, docs/PROPOSAL_20261023_SHARED_DOC_OVERWRITE.md 방안 C)
// 공용 문서(HANDOFF 등)를 여러 세션이 함께 고칠 때 「다른 세션이 방금 넣은 줄」을 지우지 않고, 「다른 세션의 미커밋 내용」도 섞지 않고 내 변경만 커밋한다.
//
// 쓰는 법(3단계):
//   1) 고치기 전:  node scripts/safe-commit.mjs --begin <파일>... [--as <이름>]      지금 파일을 사본(기준)으로 떠 둠
//   2) 파일을 평소처럼 고침(Edit 등)
//   3) 커밋:      node scripts/safe-commit.mjs "<커밋 메시지>" <파일>... [--as <이름>] [--push]
//      → 「기준 사본 → 지금 파일」 차이(=내 변경)만 최신 HEAD 위에 3방향 병합으로 얹어 커밋. 공용 스테이징도 최신으로 맞춤.
//   기준 사본 없이: … --mine   지금 파일 전체가 내 것일 때(다른 세션 미커밋 없음). 최근 2시간 다른 커밋 줄을 지우게 되면 중단.
//   HANDOFF 맨 위 항목 하나: node scripts/safe-commit.mjs --handoff <항목.md> "<메시지>" [--as <이름>] [--push]   (사본·넣기·커밋 한 번에)
//   상태 보기:    node scripts/safe-commit.mjs --status
// --as: 같은 장비에서 여러 세션이 같은 파일을 고칠 때 사본이 섞이지 않게 붙이는 이름(예: claude-win-thumbnail). 기본은 장비 이름.
// 커밋은 `git commit-tree` + `git update-ref <새> <옛>`(HEAD가 그사이 바뀌면 실패 → 최신 HEAD로 다시 병합, 최대 5번)이라
// 다른 세션 커밋을 되돌리는 일이 구조적으로 생기지 않는다. 대신 pre-commit 훅은 돌지 않으므로 되돌림 점검을 이 안에서 한다.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { dirname, join } from "node:path";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const optVal = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const as = (optVal("--as") || hostname()).replace(/[^\w.-]/g, "_");
const positional = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--as");

const run = (args, opts = {}) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024, ...opts });
const tryRun = (args, opts) => { try { return run(args, { stdio: ["pipe", "pipe", "pipe"], ...opts }); } catch { return null; } };
const ROOT = run(["rev-parse", "--show-toplevel"]).trim();
const GITDIR = run(["rev-parse", "--absolute-git-dir"]).trim();
const SNAP = join(GITDIR, "safe-commit", as);
const snapPath = (f) => join(SNAP, f.replace(/[\\/]/g, "__") + ".base");
const rel = (f) => f.replace(/\\/g, "/").replace(/^\.\//, "");
const toLF = (s) => s.replace(/\r\n/g, "\n");
const headBlob = (ref, f) => tryRun(["show", `${ref}:${f}`]);

if (flag("--status")) {
  const root = join(GITDIR, "safe-commit");
  if (!existsSync(root)) { console.log("기준 사본 없음"); process.exit(0); }
  for (const t of readdirSync(root)) for (const s of readdirSync(join(root, t))) console.log(`  ${t}: ${s.replace(/__/g, "/").replace(/\.base$/, "")}`);
  process.exit(0);
}

if (flag("--begin")) {
  if (!positional.length) { console.log("사용: node scripts/safe-commit.mjs --begin <파일>... [--as <이름>]"); process.exit(1); }
  mkdirSync(SNAP, { recursive: true });
  for (const f of positional.map(rel)) {
    const p = join(ROOT, f);
    writeFileSync(snapPath(f), existsSync(p) ? readFileSync(p) : "");
    console.log(`✔ 기준 사본: ${f}${existsSync(p) ? "" : " (새 파일)"}  [${as}]`);
  }
  process.exit(0);
}

// --handoff <항목 파일> "<메시지>": HANDOFF 맨 위(제목 다음)에 항목 하나 넣기 — 사본 뜨기·넣기·커밋을 한 번에(2026-10-23)
if (flag("--handoff")) {
  const [entryFile, msg] = positional;
  if (!entryFile || !msg || !existsSync(entryFile)) { console.log('사용: node scripts/safe-commit.mjs --handoff <항목.md> "<메시지>" [--as <이름>] [--push]   (항목은 「## 날짜 에이전트(장비) — 제목」으로 시작)'); process.exit(1); }
  const H = "docs/HANDOFF.md", HP = join(ROOT, H);
  const cur = readFileSync(HP, "utf8");
  const eol = cur.includes("\r\n") ? "\r\n" : "\n";
  const mark = `# 작업 인수인계 현황판 (HANDOFF.md)${eol}${eol}`;
  if (!cur.startsWith(mark)) { console.log(`✖ ${H} 맨 앞이 「# 작업 인수인계 현황판 (HANDOFF.md)」+빈 줄이 아닙니다 — 손으로 넣고 --begin 방식으로 커밋하세요.`); process.exit(1); }
  const entry = toLF(readFileSync(entryFile, "utf8")).trim();
  if (!entry.startsWith("## ")) { console.log("✖ 항목은 「## 」 제목 줄로 시작해야 합니다."); process.exit(1); }
  if (cur.includes(entry.split("\n")[0])) { console.log("✖ 같은 제목의 항목이 이미 있습니다(중복 방지) — 그대로 둡니다."); process.exit(1); }
  mkdirSync(SNAP, { recursive: true });
  writeFileSync(snapPath(H), cur);
  writeFileSync(HP, mark + entry.replace(/\n/g, eol) + eol + eol + cur.slice(mark.length));
  positional.splice(0, positional.length, msg, H);
}

const [message, ...files] = positional;
if (!message || !files.length) {
  console.log('사용: node scripts/safe-commit.mjs --begin <파일>...   →  고치기  →  node scripts/safe-commit.mjs "<메시지>" <파일>... [--push]');
  process.exit(1);
}
const targets = files.map(rel);
const mine = flag("--mine");
for (const f of targets) {
  if (!existsSync(join(ROOT, f))) { console.log(`✖ ${f}: 파일이 없습니다(삭제 커밋은 지원하지 않음).`); process.exit(1); }
  if (!mine && !existsSync(snapPath(f))) {
    console.log(`✖ ${f}: 기준 사본이 없습니다. 고치기 전에 --begin을 먼저 실행하세요(지금 파일 전체가 내 것이면 --mine).`);
    process.exit(1);
  }
}

/** 3방향 병합: HEAD 내용 + (기준 → 지금) 차이. 줄바꿈은 HEAD 저장 형식에 맞춤 */
function mergeOnto(head, base, work) {
  const crlf = head !== null && head.includes("\r\n");
  const norm = (s) => { const t = toLF(s); return crlf ? t.replace(/\n/g, "\r\n") : t; };
  const tmp = join(GITDIR, "safe-commit", `.tmp-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  const [a, b, c] = ["head", "base", "work"].map((n) => join(tmp, n));
  writeFileSync(a, norm(head ?? "")); writeFileSync(b, norm(base)); writeFileSync(c, norm(work));
  let out, conflicts = 0;
  try { out = run(["merge-file", "-p", "--diff3", "--marker-size=17", "-L", "HEAD", "-L", "base", "-L", "mine", a, b, c]); }
  catch (e) { out = e.stdout?.toString() ?? ""; conflicts = e.status > 0 ? e.status : -1; }
  rmSync(tmp, { recursive: true, force: true });
  if (conflicts > 0) {
    // 겹친 곳이 「양쪽 모두 같은 자리에 새 줄을 넣기만 한 것」(기준 쪽이 비어 있음)이면 둘 다 남김: 내 줄 위, HEAD 줄 아래
    // (HANDOFF 맨 위에 두 세션이 각자 항목을 넣는 흔한 경우). 기존 줄을 서로 다르게 고친 진짜 충돌은 그대로 충돌.
    const M = "".padEnd(17, "<"), B = "".padEnd(17, "|"), E = "".padEnd(17, "="), Z = "".padEnd(17, ">");
    const eol = crlf ? "\r\n" : "\n";
    const lines = out.split(eol);
    const res = [];
    let left = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith(M + " ")) { res.push(lines[i]); continue; }
      const blk = { head: [], base: [], mine: [] };
      let part = "head";
      for (i++; i < lines.length && !lines[i].startsWith(Z + " "); i++) {
        if (lines[i].startsWith(B + " ")) part = "base";
        else if (lines[i] === E) part = "mine";
        else blk[part].push(lines[i]);
      }
      // 줄 단위 판단: 기준의 (빈 줄 아닌) 같은 줄을 HEAD도 나도 없앴으면 = 둘 다 고침 → 진짜 충돌.
      // 아니면 내 결과에서 「기준엔 있고 HEAD엔 없는 줄」(다른 세션 미커밋 줄·다른 세션이 지운 줄)을 빼고, HEAD에만 새로 생긴 줄을 뒤에 붙임
      const hs = new Set(blk.head), bs = new Set(blk.base), ms = new Set(blk.mine);
      const both = blk.base.some((l) => l.trim() && !hs.has(l) && !ms.has(l));
      if (!both) res.push(...blk.mine.filter((l) => !l.trim() || !bs.has(l) || hs.has(l)), ...blk.head.filter((l) => l.trim() && !bs.has(l) && !ms.has(l)));
      else { left += 1; res.push(M + " HEAD", ...blk.head, B + " base", ...blk.base, E, ...blk.mine, Z + " mine"); }
    }
    return { out: res.join(eol), conflicts: left };
  }
  return { out, conflicts };
}

/** 이 결과가 최근 2시간 안 다른 커밋이 넣은 줄을 지우는지(같은 머리말의 새 줄이 있으면 「고친 것」으로 봄) */
function revertedLines(f, headText, newText) {
  const h = toLF(headText ?? "").split("\n").map((l) => l.trimEnd());
  const nSet = new Set(toLF(newText).split("\n").map((l) => l.trimEnd()));
  const heads = new Set([...nSet].map((l) => l.slice(0, 30)));
  const removed = h.filter((l) => l.trim().length > 12 && !nSet.has(l) && !heads.has(l.slice(0, 30)));
  if (!removed.length) return [];
  const recent = tryRun(["log", "--since=2 hours ago", "--format=", "-p", "--", f]) ?? "";
  const added = new Set(recent.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => toLF(l.slice(1)).trimEnd()));
  return removed.filter((l) => added.has(l));
}

const branch = run(["symbolic-ref", "--short", "HEAD"]).trim();
let done = null;
for (let attempt = 1; attempt <= 5 && !done; attempt++) {
  const oldHead = run(["rev-parse", "HEAD"]).trim();
  const tmpIndex = join(GITDIR, `index.safe-commit-${process.pid}`);
  const env = { ...process.env, GIT_INDEX_FILE: tmpIndex };
  const results = [];
  try {
    run(["read-tree", oldHead], { env });
    for (const f of targets) {
      const head = headBlob(oldHead, f);
      const work = readFileSync(join(ROOT, f), "utf8");
      let text;
      if (mine) {
        const crlf = head !== null && head.includes("\r\n");
        text = crlf ? toLF(work).replace(/\n/g, "\r\n") : toLF(work);
        const lost = revertedLines(f, head, text);
        if (lost.length && !flag("--force")) {
          console.log(`✖ ${f}: 최근 2시간 안 다른 커밋이 넣은 ${lost.length}줄을 지우게 됩니다 — 중단(파일·커밋 그대로).`);
          for (const l of lost.slice(0, 3)) console.log(`    - ${l.slice(0, 110)}`);
          console.log("  지금 파일에 그 줄을 되살리거나, --begin 방식으로 다시 하세요.");
          process.exit(1);
        }
      } else {
        const base = readFileSync(snapPath(f), "utf8");
        const m = mergeOnto(head, base, work);
        if (m.conflicts) {
          console.log(`✖ ${f}: 최신 HEAD와 내 변경이 같은 자리에서 겹칩니다(충돌 ${m.conflicts}곳) — 중단(파일·커밋 그대로).`);
          console.log("  최신 HEAD를 다시 읽고 그 위에 다시 고친 뒤 --begin부터 다시 하세요.");
          process.exit(1);
        }
        text = m.out;
      }
      if (head !== null && text === head) { results.push({ f, same: true }); continue; }
      const sha = run(["hash-object", "-w", "--stdin"], { input: text }).trim();
      run(["update-index", "--add", "--cacheinfo", `100644,${sha},${f}`], { env });
      results.push({ f, sha, head, text });
    }
    const changed = results.filter((r) => !r.same);
    if (!changed.length) { console.log("바뀐 내용이 없습니다(최신 HEAD와 같음) — 커밋하지 않음."); process.exit(0); }
    const tree = run(["write-tree"], { env }).trim();
    const commit = run(["commit-tree", tree, "-p", oldHead], { input: message.endsWith("\n") ? message : message + "\n" }).trim();
    // HEAD가 그대로일 때만 옮김(바뀌었으면 실패 → 최신 HEAD로 다시)
    if (tryRun(["update-ref", "-m", `safe-commit: ${message.split("\n")[0]}`, `refs/heads/${branch}`, commit, oldHead]) === null) {
      console.log(`… 그사이 다른 커밋이 들어와 다시 병합합니다(${attempt}/5)`);
      continue;
    }
    done = { commit, oldHead, changed };
  } finally {
    rmSync(tmpIndex, { force: true });
  }
}
if (!done) { console.log("✖ 5번 시도했지만 HEAD가 계속 바뀌어 커밋하지 못했습니다. 잠시 뒤 다시 실행하세요."); process.exit(1); }

// 공용 스테이징(인덱스) 맞추기: 다른 세션이 올려 둔 게 없으면 새 HEAD로, 있으면 그 내용 위에 내 변경도 얹음
// 다른 세션이 index.lock을 잡고 있으면 실패하므로 풀릴 때까지 다시 시도(최대 약 40초) — 2026-10-23 조용히 실패해 관리자 화면 파일 스테이징이 옛 내용으로 남았던 사고
const sleepMs = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const indexOp = (args) => {
  for (let i = 0; i < 40; i++) {
    if (tryRun(args) !== null) return true;
    sleepMs(1000);
  }
  return false;
};
const indexFailed = [];
for (const r of done.changed) {
  const staged = tryRun(["show", `:${r.f}`]);
  // 스테이징 내용이 최근 커밋 이력에 있던 내용 그대로면 「묵은 항목」(누군가 별도 인덱스로 커밋한 뒤 안 맞춘 것) → 새 HEAD로 맞춤
  const stagedSha = (tryRun(["ls-files", "-s", "--", r.f]) ?? "").split(/\s+/)[1];
  const history = new Set((tryRun(["log", "-200", "--no-abbrev", "--format=", "--raw", "--", r.f]) ?? "").split("\n").map((l) => l.split(/\s+/)[3]).filter(Boolean));
  if (staged === null || staged === (r.head ?? null) || (stagedSha && history.has(stagedSha))) {
    if (!indexOp(["reset", "-q", "HEAD", "--", r.f])) indexFailed.push(r.f);
    continue;
  }
  if (staged === r.text) continue;
  const m = mergeOnto(staged, r.head ?? "", r.text);
  if (m.conflicts) { console.log(`⚠ ${r.f}: 다른 세션이 스테이징해 둔 내용과 겹쳐 공용 스테이징은 그대로 뒀습니다 — 그 세션 커밋 때 내 줄이 빠질 수 있으니 확인하세요.`); continue; }
  const sha = run(["hash-object", "-w", "--stdin"], { input: m.out }).trim();
  if (indexOp(["update-index", "--cacheinfo", `100644,${sha},${r.f}`])) console.log(`  ${r.f}: 다른 세션 스테이징 내용 위에 내 변경도 반영`);
  else indexFailed.push(r.f);
}
if (indexFailed.length) {
  console.log(`⚠ 공용 스테이징을 맞추지 못했습니다(다른 세션 잠금이 계속됨): ${indexFailed.join(", ")}`);
  console.log(`  잠시 뒤 직접: git reset -q HEAD -- ${indexFailed.join(" ")}  — 그대로 두면 다른 세션 커밋이 이 파일을 옛 내용으로 되돌릴 수 있습니다.`);
}
for (const f of targets) rmSync(snapPath(f), { force: true });

console.log(`✔ 커밋 ${done.commit.slice(0, 9)} — ${done.changed.map((r) => r.f).join(", ")}`);
console.log(run(["show", "--stat", "--format=", done.commit]).trim());
// 들어간 바뀐 줄 미리 보기 — 기준 사본을 뜬 뒤 다른 세션이 같은 파일을 고쳤다면 그 줄도 「내 변경」으로 들어가므로 눈으로 확인(2026-10-23)
const changedLines = run(["show", "-U0", "--format=", done.commit]).split("\n").filter((l) => /^[-+]/.test(l) && !/^(\+\+\+|---) /.test(l));
console.log(`  바뀐 줄 ${changedLines.length}개${changedLines.length > 16 ? " (앞 16개)" : ""} — 내가 고치지 않은 줄이 있으면 기준 사본 뒤 다른 세션이 고친 것:`);
for (const l of changedLines.slice(0, 16)) console.log(`    ${l.slice(0, 110)}`);
if (flag("--push")) {
  const p = tryRun(["push", "-q", "origin", branch], { stdio: ["ignore", "pipe", "pipe"] });
  console.log(p === null ? "✖ 푸시 실패 — `git push origin " + branch + "`로 다시 하세요." : `✔ 푸시 origin/${branch}`);
}
