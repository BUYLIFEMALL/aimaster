#!/usr/bin/env node
// 일반 커밋 도우미 — 2026-10-23 (Claude Code 윈도우, 주인님 승인: 「일반 커밋 도우미 새로 만들기」)
// 공용 스테이징(.git/index)을 읽지 않고 「최신 HEAD에서 시작한 임시 스테이징 + 내 경로」만으로 커밋한다.
// 배경: 2026-10-23 공용 스테이징이 두 번(65개·11개) 쪼그라들었고, 두 번 다 경로 지정 커밋(git commit -- <경로>) 시각과 겹쳤다
//       (경로 지정 커밋은 공용 인덱스를 읽어 다시 쓴다 → 교체 순간을 빈 인덱스로 읽으면 내 경로만 남김, docs/ERROR_LESSONS.md).
//
// 쓰는 법:  node scripts/commit-paths.mjs "<커밋 메시지>" <경로>... [--push] [--as <세션이름>]
//   경로는 파일·폴더 모두 가능. 새 파일·지운 파일·이미지·실행 권한까지 `git add -A -- <경로>`로 담는다.
//   공용 문서(HANDOFF 등)는 거부 → node scripts/safe-commit.mjs 사용.
// 하는 일: ① 임시 스테이징 = 최신 HEAD + 내 경로 ② 커밋 전 검사(대량 삭제 차단·OpenAI 모델·공용 문서 되돌림 경고)를 그 임시 스테이징으로 실행
//          ③ commit-tree + update-ref <새> <옛>(그사이 HEAD가 바뀌면 최신 HEAD로 다시, 최대 5번)
//          ④ 공용 스테이징이 정상일 때만 내 경로 항목을 새 HEAD로 맞춤(쪼그라들어 있으면 건드리지 않고 경고)
// 주인님이 승인한 실제 대량 삭제만 AIMASTER_ALLOW_MASS_DELETE=1.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const GITDIR = resolve(ROOT, execFileSync("git", ["rev-parse", "--git-dir"], { cwd: ROOT, encoding: "utf8" }).trim());
const SHARED_DOCS = [
  "docs/HANDOFF.md", "docs/PENDING_DEPLOYS.md", "docs/PROGRAM_CAPABILITY_MAP.md", "docs/SHARED_MODULES.md",
  "docs/PROGRAM_IDEA_BACKLOG.md", "docs/ERROR_LESSONS.md", "docs/ACTIVE_WORK.md", "docs/VERCEL_COST_REDUCTION_PLAN.md",
  "CLAUDE.md", "AGENTS.md", "GEMINI.md", "DESIGN.md",
];
const run = (args, opts = {}) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, ...opts });
const tryRun = (args, opts = {}) => { try { return run(args, { stdio: ["pipe", "pipe", "pipe"], ...opts }); } catch { return null; } };
const count = (t) => (t ? t.split("\n").filter(Boolean).length : 0);
const sleepMs = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const args = process.argv.slice(2);
const push = args.includes("--push");
// --as <세션이름>: 블랙박스 기록에 세션 이름(없으면 환경변수 AIMASTER_SESSION, 2026-10-23)
const asIdx = args.indexOf("--as");
const as = ((asIdx >= 0 ? args[asIdx + 1] : process.env.AIMASTER_SESSION) || "").replace(/[^\w.-]/g, "_");
const [message, ...paths] = args.filter((a, i) => a !== "--push" && a !== "--as" && (asIdx < 0 || i !== asIdx + 1));
if (!message || !paths.length) {
  console.log('사용: node scripts/commit-paths.mjs "<커밋 메시지>" <경로>... [--push]');
  process.exit(2);
}
const rel = paths.map((p) => p.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, ""));
const shared = rel.filter((p) => SHARED_DOCS.includes(p));
if (shared.length) {
  console.log(`✖ 공용 문서는 이 도우미로 커밋하지 않습니다: ${shared.join(", ")}\n  node scripts/safe-commit.mjs --begin <파일> --as <세션이름> → 고침 → node scripts/safe-commit.mjs "<메시지>" <파일> --as <세션이름> --push`);
  process.exit(1);
}

// 임시 스테이징 정리: 끝날 때 항상 내 것을 지우고(process.exit은 finally를 건너뜀), 시작할 때 1시간 넘은 같은 종류를 지운다(공용 index는 안 건드림)
for (const n of readdirSync(GITDIR)) {
  if (!n.startsWith("index.commit-paths-")) continue;
  try { if (Date.now() - statSync(join(GITDIR, n)).mtimeMs > 3600_000) rmSync(join(GITDIR, n), { force: true }); } catch { /* 다른 세션이 막 지움 */ }
}
process.on("exit", () => { for (const s of ["", ".lock"]) rmSync(join(GITDIR, `index.commit-paths-${process.pid}${s}`), { force: true }); });
// 공용 스테이징 블랙박스: 시작·끝에 한 줄(scripts/index-watch.mjs, 막지 않음)
const watchIndex = (tag) => { if (!existsSync(join(ROOT, "scripts", "index-watch.mjs"))) return; try { spawnSync(process.execPath, [join(ROOT, "scripts", "index-watch.mjs"), tag, "--quiet"], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] }); } catch { /* 기록 실패는 무시 */ } };
watchIndex(as ? `commit-paths:start(${as})` : "commit-paths:start");
process.on("exit", () => watchIndex(as ? `commit-paths:end(${as})` : "commit-paths:end"));
const branch = run(["symbolic-ref", "--short", "HEAD"]).trim();
let done = null;
for (let attempt = 1; attempt <= 5 && !done; attempt++) {
  const oldHead = run(["rev-parse", "HEAD"]).trim();
  const tmpIndex = join(GITDIR, `index.commit-paths-${process.pid}`);
  const env = { ...process.env, GIT_INDEX_FILE: tmpIndex };
  try {
    run(["read-tree", oldHead], { env });
    run(["add", "-A", "--", ...rel], { env });
    const status = run(["diff", "--cached", "--name-status", oldHead], { env }).trim();
    if (!status) { console.log("바뀐 내용이 없습니다(최신 HEAD와 같음) — 커밋하지 않음."); process.exit(0); }
    // 커밋 전 검사 — 훅과 같은 스크립트를 임시 스테이징으로 돌림(commit-tree는 훅을 거치지 않으므로)
    for (const [script, blocking] of [["check-index-health.mjs", true], ["check-openai-models.mjs", false], ["check-shared-doc-reverts.mjs", false]]) {
      const f = join(ROOT, "scripts", script);
      if (!existsSync(f)) continue;
      const r = spawnSync(process.execPath, [f, "--staged"], { cwd: ROOT, env, encoding: "utf8" });
      if (r.stderr?.trim()) console.error(r.stderr.trimEnd());
      if (blocking && r.status !== 0) { console.log("✖ 커밋 전 검사에 걸려 중단(파일·커밋 그대로)."); process.exit(1); }
    }
    const tree = run(["write-tree"], { env }).trim();
    const commit = run(["commit-tree", tree, "-p", oldHead], { input: message.endsWith("\n") ? message : message + "\n" }).trim();
    if (tryRun(["update-ref", "-m", `commit-paths: ${message.split("\n")[0]}`, `refs/heads/${branch}`, commit, oldHead]) === null) {
      console.log(`… 그사이 다른 커밋이 들어와 최신 HEAD로 다시 합니다(${attempt}/5)`);
      continue;
    }
    done = { commit, oldHead, status };
  } finally {
    rmSync(tmpIndex, { force: true });
    rmSync(tmpIndex + ".lock", { force: true });
  }
}
if (!done) { console.log("✖ 5번 시도했지만 HEAD가 계속 바뀌어 커밋하지 못했습니다. 잠시 뒤 다시 실행하세요."); process.exit(1); }

// 공용 스테이징: 정상일 때만 내 경로를 새 HEAD로 맞춘다(안 맞추면 다른 세션의 일반 커밋이 이 경로를 옛 내용으로 되돌릴 수 있음)
const headCount = count(run(["ls-tree", "-r", "--name-only", "HEAD"]));
const indexCount = count(tryRun(["ls-files"]) ?? "");
if (indexCount * 2 < headCount) {
  console.log(`⚠ 공용 스테이징 파일 수 ${indexCount}개가 HEAD ${headCount}개의 절반보다 적어 건드리지 않았습니다 — 스테이징이 망가졌을 수 있으니 주인님께 알리세요(루트 CLAUDE.md 최상단).`);
} else {
  let ok = false;
  for (let i = 0; i < 40 && !ok; i++) {
    ok = tryRun(["reset", "-q", "HEAD", "--", ...rel]) !== null;
    if (!ok) sleepMs(1000);
  }
  if (!ok) console.log(`⚠ 공용 스테이징을 맞추지 못했습니다(다른 세션 잠금이 계속됨). 잠시 뒤 직접: git reset -q HEAD -- ${rel.join(" ")}`);
  else if (count(tryRun(["ls-files"]) ?? "") * 2 < headCount) console.log("⚠ 맞춘 뒤 공용 스테이징 파일 수가 줄었습니다 — 주인님께 알리세요.");
}

console.log(`✔ 커밋 ${done.commit.slice(0, 9)}`);
console.log(run(["show", "--stat", "--format=", done.commit]).trim());
const deleted = done.status.split("\n").filter((l) => l.startsWith("D")).length;
if (deleted) console.log(`  (지운 파일 ${deleted}개 포함)`);
if (push) {
  const p = spawnSync("git", ["push", "-q", "origin", branch], { cwd: ROOT, encoding: "utf8" });
  console.log(p.status === 0 ? `✔ 푸시 origin/${branch}` : `✖ 푸시 실패 — git push origin ${branch}로 다시 하세요.\n${(p.stderr || "").trim()}`);
}
