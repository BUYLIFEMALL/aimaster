// 안전 커밋 도우미(scripts/safe-commit.mjs) 자동 시험 — 2026-10-23 (Claude Code 윈도우)
// 매 시나리오마다 빈 임시 저장소를 만들고 지금의 safe-commit.mjs를 복사해 실제로 실행한다(이 저장소는 건드리지 않음).
// 실행: node --test scripts/safe-commit.test.mjs
// 배경: 겹친 구역 자동 풀이가 줄 순서를 바꾸던 결함(A B C D2 E2 F2 → A B E2 F2 C D2)을 고친 뒤, 같은 결함이 다시 들어오지 않게 남김.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// 다른 판(예: 고치기 전)을 시험하려면 SAFE_COMMIT_HELPER=<파일 경로>
const HELPER = process.env.SAFE_COMMIT_HELPER || join(dirname(fileURLToPath(import.meta.url)), "safe-commit.mjs");

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "safe-commit-test-"));
  mkdirSync(join(dir, "scripts"));
  copyFileSync(HELPER, join(dir, "scripts", "safe-commit.mjs"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t"); git("config", "user.name", "t"); git("config", "core.autocrlf", "false");
  const write = (f, lines) => writeFileSync(join(dir, f), lines.join("\n") + "\n");
  const read = (f) => readFileSync(join(dir, f), "utf8");
  const head = (f) => git("show", `HEAD:${f}`).trimEnd().split("\n");
  const helper = (...a) => spawnSync(process.execPath, ["scripts/safe-commit.mjs", ...a], { cwd: dir, encoding: "utf8" });
  const commit = (f, lines, msg) => { write(f, lines); git("add", f); git("commit", "-qm", msg); };
  return { dir, git, write, read, head, helper, commit, done: () => rmSync(dir, { recursive: true, force: true }) };
}

test("① 옆자리 겹침: 내 변경은 제자리에, 다른 세션 미커밋 줄은 빠진다", () => {
  const r = repo();
  try {
    const base = ["A", "B", "C", "D", "E", "F", "G", "H"];
    r.commit("m.md", base, "c1");
    r.write("m.md", ["A", "B", "C-남미커밋", "D", "E", "F", "G", "H"]);          // 다른 세션이 고쳐 둔 미커밋 줄
    assert.equal(r.helper("--begin", "m.md", "--as", "me").status, 0);
    const mine = ["A", "B", "C-남미커밋", "D", "E2", "F2", "G", "H"];             // 내가 E·F 고침
    r.commit("m.md", ["A", "B", "C", "D2-남커밋", "E", "F", "G", "H"], "남이 D 커밋"); // 그사이 다른 세션 커밋
    r.write("m.md", mine);
    const out = r.helper("내 커밋", "m.md", "--as", "me");
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.deepEqual(r.head("m.md"), ["A", "B", "C", "D2-남커밋", "E2", "F2", "G", "H"]);
  } finally { r.done(); }
});

test("② 맨 위 동시 추가: 두 세션 항목이 모두 남는다", () => {
  const r = repo();
  try {
    r.commit("h.md", ["X", "Y"], "h1");
    assert.equal(r.helper("--begin", "h.md", "--as", "me").status, 0);
    r.commit("h.md", ["남항목", "X", "Y"], "남 추가");
    r.write("h.md", ["내항목", "X", "Y"]);
    const out = r.helper("내 추가", "h.md", "--as", "me");
    assert.equal(out.status, 0, out.stdout + out.stderr);
    const got = r.head("h.md");
    assert.ok(got.includes("남항목") && got.includes("내항목"), got.join("|"));
    assert.deepEqual(got.slice(-2), ["X", "Y"]);
  } finally { r.done(); }
});

test("③ 같은 줄을 서로 다르게 고침: 중단하고 커밋하지 않는다", () => {
  const r = repo();
  try {
    r.commit("c.md", ["A", "B", "C"], "c1");
    assert.equal(r.helper("--begin", "c.md", "--as", "me").status, 0);
    r.commit("c.md", ["A", "B-남", "C"], "남이 B 고침");
    const before = r.git("rev-parse", "HEAD").trim();
    r.write("c.md", ["A", "B-나", "C"]);
    const out = r.helper("내 커밋", "c.md", "--as", "me");
    assert.notEqual(out.status, 0, "충돌인데 커밋됨: " + out.stdout);
    assert.equal(r.git("rev-parse", "HEAD").trim(), before);
    assert.deepEqual(r.read("c.md").trimEnd().split("\n"), ["A", "B-나", "C"]); // 작업 파일 그대로
  } finally { r.done(); }
});

test("④ --mine + 최근 2시간 다른 커밋: 커밋은 하되 푸시는 미룬다", () => {
  const r = repo();
  try {
    r.commit("n.md", ["a"], "c1");
    r.commit("n.md", ["a", "b"], "다른 세션 커밋");
    r.write("n.md", ["a", "b", "c"]);
    const out = r.helper("내 커밋", "n.md", "--mine", "--push");
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /푸시는 미뤘습니다/);
    assert.deepEqual(r.head("n.md"), ["a", "b", "c"]);
  } finally { r.done(); }
});
