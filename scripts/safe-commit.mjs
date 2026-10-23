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
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const optVal = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
// 세션 이름 필수(2026-10-23 주인님 결정): --as 또는 환경변수 AIMASTER_SESSION. 없으면 거부 — 블랙박스의 CLI 구분·시작 점검 누락 알림·되돌림 감사가 세션 이름에 기대므로.
// 이름 첫 단어가 claude-·codex-·agy-가 아니면 막지 않고 안내만(멀티세션 규칙 §2 「<CLI>-<장비>-<날짜>-<작업>」)
const sessionName = optVal("--as") || process.env.AIMASTER_SESSION || "";
if (argv.length && !sessionName) {
  console.error("✖ 세션 이름이 없습니다 — `--as <세션명>`을 붙이거나 환경변수 AIMASTER_SESSION을 설정해 다시 실행하세요.\n  예: node scripts/safe-commit.mjs \"<메시지>\" <파일> --as codex-win-20261023-작업   (형식 <CLI>-<장비>-<날짜>-<작업>, docs/MULTI_AGENT_SESSION_RULES.md §2)\n  --begin과 커밋에는 같은 이름을 씁니다(기준 사본을 이름으로 찾음).");
  process.exit(2);
}
if (sessionName && !/^(claude|codex|agy)-/.test(sessionName)) console.error(`ℹ 세션 이름 「${sessionName}」이 claude-·codex-·agy-로 시작하지 않아 블랙박스가 CLI를 구분하지 못합니다(커밋은 진행).`);
const as = sessionName.replace(/[^\w.-]/g, "_");
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
  // 2026-10-23: --mine이면 「지금 없고 HEAD에는 있는 파일」을 삭제로 커밋한다(일반 파일도 도우미로 커밋 — 경로 지정 커밋이 공용 스테이징을 줄이던 사고 대책)
  if (!existsSync(join(ROOT, f))) {
    if (mine && tryRun(["cat-file", "-e", `HEAD:${f}`]) !== null) continue;
    console.log(`✖ ${f}: 파일이 없습니다(삭제 커밋은 --mine으로만, 최신 커밋에 있는 파일이어야 함).`); process.exit(1);
  }
  if (!mine && !existsSync(snapPath(f))) {
    console.log(`✖ ${f}: 기준 사본이 없습니다. 고치기 전에 --begin을 먼저 실행하세요(지금 파일 전체가 내 것이면 --mine).`);
    process.exit(1);
  }
}

/** 충돌 때 재시도(2026-10-23): (기준 → 지금) 차이를 덩어리로 나눠, 덩어리마다 「바뀌기 전 줄들」이 HEAD에서 정확히 한 곳이면 그 자리를 바꾼다.
 *  기준 사본에 다른 세션의 미커밋 줄이 섞여 3방향 병합이 「같은 자리」로 멈출 때, 내 덩어리만 HEAD에 얹는다(오늘 손으로 하던 「HEAD + 내 변경」).
 *  앞뒤 2줄을 붙여 찾고, 못 찾으면 붙인 줄 없이 다시 찾는다. 하나라도 못 찾거나 여러 곳이면 실패(추측해서 넣지 않음). */
function patchOnto(head, base, work) {
  if (head === null) return null;
  const crlf = head.includes("\r\n");
  const H = toLF(head).split("\n");
  const tmp = join(GITDIR, "safe-commit", `.tmp-p-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  const [b, w] = ["base", "work"].map((n) => join(tmp, n));
  writeFileSync(b, toLF(base)); writeFileSync(w, toLF(work));
  const diffOf = (ctx) => { try { return run(["diff", "--no-index", "--no-color", `-U${ctx}`, b, w]); } catch (e) { return e.stdout?.toString() ?? ""; } };
  const hunksOf = (txt) => {
    const out = []; let cur = null;
    for (const l of txt.split("\n")) {
      if (l.startsWith("@@")) { cur = { before: [], after: [] }; out.push(cur); continue; }
      if (!cur || l.startsWith("\\")) continue;
      if (l.startsWith(" ")) { cur.before.push(l.slice(1)); cur.after.push(l.slice(1)); }
      else if (l.startsWith("-")) cur.before.push(l.slice(1));
      else if (l.startsWith("+")) cur.after.push(l.slice(1));
    }
    return out;
  };
  const find = (seq) => {
    if (!seq.length) return [];
    const hits = [];
    for (let i = 0; i + seq.length <= H.length; i++) if (seq.every((s, k) => H[i + k] === s)) hits.push(i);
    return hits;
  };
  const wide = hunksOf(diffOf(2)), narrow = hunksOf(diffOf(0));
  rmSync(tmp, { recursive: true, force: true });
  const plan = [];
  for (const h of wide) {
    let hits = find(h.before), use = h;
    if (hits.length !== 1) {
      // 붙인 줄(앞뒤 문맥)에 다른 세션 줄이 섞였을 수 있음 → 같은 변경의 문맥 없는 덩어리로(빼는 줄이 있을 때만 — 순수 추가는 자리를 알 수 없음)
      const core = narrow.filter((n) => n.before.length && h.before.join("\n").includes(n.before.join("\n")) && h.after.join("\n").includes(n.after.join("\n")));
      if (core.length !== 1) return null;
      use = core[0]; hits = find(use.before);
      if (hits.length !== 1) return null;
    }
    plan.push({ at: hits[0], len: use.before.length, after: use.after });
  }
  plan.sort((x, y) => y.at - x.at);
  for (let i = 1; i < plan.length; i++) if (plan[i].at + plan[i].len > plan[i - 1].at) return null; // 덩어리가 겹치면 포기
  for (const p of plan) H.splice(p.at, p.len, ...p.after);
  const out = H.join("\n");
  return crlf ? out.replace(/\n/g, "\r\n") : out;
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
    // 2026-10-23: 겹침이 있으면 먼저 「내 변경 덩어리를 HEAD의 정확한 자리에」 얹어 본다 — 아래 자동 풀이는 「내 줄 → HEAD 줄」로 이어 붙여
    // 줄 순서가 바뀔 수 있었다(임시 저장소 재현: A B C D2 E2 F2 → A B E2 F2 C D2). 덩어리 자리를 못 찾을 때만(예: 두 세션이 맨 위에 각자 추가) 아래로.
    const p = patchOnto(head, base, work);
    if (p !== null) return { out: p, conflicts: 0, patched: true };
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

// 임시 스테이징 정리(2026-10-23): 끝날 때 항상 내 것을 지운다(process.exit은 아래 finally를 건너뛰어 .git에 11개가 쌓였음)
// + 시작할 때 1시간 넘은 같은 종류(index.safe-commit-*)를 지운다(보통 몇 초만 존재 — 1시간 넘었으면 끊긴 흔적). 공용 index·index.lock은 건드리지 않음.
for (const n of readdirSync(GITDIR)) {
  if (!n.startsWith("index.safe-commit-")) continue;
  try { if (Date.now() - statSync(join(GITDIR, n)).mtimeMs > 3600_000) rmSync(join(GITDIR, n), { force: true }); } catch { /* 다른 세션이 막 지움 */ }
}
process.on("exit", () => { for (const s of ["", ".lock"]) rmSync(join(GITDIR, `index.safe-commit-${process.pid}${s}`), { force: true }); });
// 공용 스테이징 블랙박스(2026-10-23): 시작·끝에 index 크기·항목 수를 .git/aimaster-index-log.txt에(축소 원인 추적, 막지 않음)
const watchIndex = (tag) => { if (!existsSync(join(ROOT, "scripts", "index-watch.mjs"))) return; try { spawnSync(process.execPath, [join(ROOT, "scripts", "index-watch.mjs"), tag, "--quiet"], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] }); } catch { /* 기록 실패는 무시 */ } };
// 이름표에 --as 세션 이름(같은 윈도우 장비의 여러 세션을 pid 말고 이름으로 구분, 2026-10-23)
// 시작 기록 때 묵은 스테이징 항목도 확인해 안내만(2026-10-23) — 이 도우미는 임시 스테이징으로 커밋해 섞이지 않지만, 일반 커밋을 하는 세션은 위험
const noteStale = (tag) => { if (!existsSync(join(ROOT, "scripts", "index-watch.mjs"))) return; try { const r = spawnSync(process.execPath, [join(ROOT, "scripts", "index-watch.mjs"), tag, "--quiet", "--stale-only"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }); if (r.status === 3) console.error(`ℹ 안내(이 커밋에는 섞이지 않음, 일반 커밋 전에 정리 권장):\n${(r.stdout || "").trimEnd()}`); } catch { /* 기록 실패는 무시 */ } };
noteStale(`safe-commit:start(${as})`);
process.on("exit", () => watchIndex(`safe-commit:end(${as})`));
const branch = run(["symbolic-ref", "--short", "HEAD"]).trim();
// --mine은 작업 파일 전체를 올리므로, 최근 2시간 안 다른 커밋이 같은 파일을 고쳤다면 다른 세션이 작업 파일에 남긴 미커밋 줄도 섞일 수 있다
// → 그 커밋 목록을 보여 주고 --push가 있어도 푸시는 미룬다(바뀐 줄 미리 보기를 눈으로 확인한 뒤 손으로 푸시, 2026-10-23)
const mineRecent = mine ? targets.flatMap((f) => (tryRun(["log", "--since=2 hours ago", "--format=%h %ad %s", "--date=format:%H:%M", "--", f]) ?? "").split("\n").filter(Boolean).map((l) => `${f}: ${l}`)) : [];
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
      // 2026-10-23: 삭제(--mine, 지금 파일 없음) — 임시 인덱스에서 빼기만 한다
      if (!existsSync(join(ROOT, f))) {
        if (head === null) { results.push({ f, same: true }); continue; }
        run(["update-index", "--force-remove", "--", f], { env });
        results.push({ f, deleted: true, head });
        continue;
      }
      // 2026-10-23: 이진 파일(0 바이트 포함, 예: 확장 ZIP·이미지) — 글자 병합 없이 원래 바이트 그대로 올린다(--mine만)
      const raw = readFileSync(join(ROOT, f));
      if (raw.includes(0)) {
        if (!mine) { console.log(`✖ ${f}: 이진 파일은 줄 단위 병합을 할 수 없습니다 — 파일 전체가 내 것이면 --mine으로 커밋하세요.`); process.exit(1); }
        const sha = run(["hash-object", "-w", "--stdin"], { input: raw }).trim();
        if (tryRun(["rev-parse", `${oldHead}:${f}`])?.trim() === sha) { results.push({ f, same: true }); continue; }
        const mode = (tryRun(["ls-tree", oldHead, "--", f]) ?? "").split(/\s+/)[0] || "100644";
        run(["update-index", "--add", "--cacheinfo", `${mode},${sha},${f}`], { env });
        results.push({ f, sha, head, binary: true });
        continue;
      }
      const work = raw.toString("utf8");
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
        if (m.patched) console.log(`ℹ ${f}: 3방향 병합이 겹쳐 「HEAD + 내 변경 덩어리」(각 덩어리를 HEAD의 같은 자리에) 방식으로 얹었습니다 — 기준 사본에 다른 세션 미커밋 줄이 섞인 경우. 아래 바뀐 줄을 확인하세요.`);
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
    // --as를 직접 줬으면 메시지 끝 단락에 `AIMaster-Session: <이름>` 트레일러 — 되돌림 감사가 「어느 세션의 커밋인지」 보여 준다(2026-10-23)
    const msgOut = as && !/^AIMaster-Session:/m.test(message) ? `${message.replace(/\s+$/, "")}\nAIMaster-Session: ${as}\n` : (message.endsWith("\n") ? message : message + "\n");
    const commit = run(["commit-tree", tree, "-p", oldHead], { input: msgOut }).trim();
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
// 2026-10-23 14:00 사고 대책(주인님 승인): 도우미 두 개가 동시에 이 단계를 돌면 공용 스테이징이 2개로 줄었다(블랙박스 기록).
// → 도우미 전용 잠금으로 한 번에 하나씩. 20초 안에 못 잡으면 이 단계를 건너뛴다(맞추지 못한 스테이징 < 망가진 스테이징).
// 2분 넘은 잠금은 끊긴 도우미의 흔적으로 보고 치운다(git의 index.lock은 건드리지 않음). 이미 줄어 있으면 더 쓰지 않는다.
const SYNC_LOCK = join(GITDIR, "safe-commit-index.lock");
const takeSyncLock = () => {
  const tries = Number(process.env.SAFE_COMMIT_SYNC_TRIES) || 40; // 0.5초 × 40 = 20초(시험에서만 줄임)
  for (let i = 0; i < tries; i++) {
    try { writeFileSync(SYNC_LOCK, `${process.pid} ${new Date().toISOString()}`, { flag: "wx" }); return true; }
    catch { try { if (Date.now() - statSync(SYNC_LOCK).mtimeMs > 120000) { rmSync(SYNC_LOCK, { force: true }); continue; } } catch { /* 방금 풀림 */ } }
    sleepMs(500);
  }
  return false;
};
const headCount = (tryRun(["ls-tree", "-r", "--name-only", done.commit]) ?? "").split("\n").filter(Boolean).length;
const indexCount = (tryRun(["ls-files"]) ?? "").split("\n").filter(Boolean).length;
const syncSkip = indexCount < headCount / 2 ? `공용 스테이징이 이미 줄어 있습니다(${indexCount} / 최신 커밋 ${headCount}) — 더 쓰지 않고 주인님께 알리세요`
  : !takeSyncLock() ? "다른 도우미가 공용 스테이징을 맞추는 중이라 20초 안에 차례가 오지 않았습니다" : "";
if (syncSkip) {
  console.log(`⚠ 공용 스테이징 맞추기를 건너뜁니다: ${syncSkip}.`);
  console.log(`  커밋은 정상입니다. 잠시 뒤 다른 도우미가 없을 때: git reset -q HEAD -- ${done.changed.map((r) => r.f).join(" ")}`);
}
if (!syncSkip) try {
for (const r of done.changed) {
  // 2026-10-23: 삭제·이진 파일은 공용 스테이징을 새 HEAD에 맞추기만 한다(줄 병합 대상 아님)
  if (r.deleted || r.binary) { if (!indexOp(["reset", "-q", "HEAD", "--", r.f])) indexFailed.push(r.f); continue; }
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
} finally { rmSync(SYNC_LOCK, { force: true }); }
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
if (mineRecent.length) {
  console.log(`⚠ --mine: 최근 2시간 안 다른 커밋 ${mineRecent.length}개가 같은 파일을 고쳤습니다 — 작업 파일에 다른 세션의 미커밋 줄이 있었다면 위 「바뀐 줄」에 섞였습니다.`);
  for (const l of mineRecent.slice(0, 5)) console.log(`    ${l.slice(0, 110)}`);
  if (flag("--push")) console.log(`  푸시는 미뤘습니다. 위 바뀐 줄이 모두 내 것이면: git push origin ${branch}  (아니면 다음 커밋으로 그 줄을 되돌리고 그 세션에 알리기)`);
}
if (flag("--push") && !mineRecent.length) {
  const p = tryRun(["push", "-q", "origin", branch], { stdio: ["ignore", "pipe", "pipe"] });
  console.log(p === null ? "✖ 푸시 실패 — `git push origin " + branch + "`로 다시 하세요." : `✔ 푸시 origin/${branch}`);
}
