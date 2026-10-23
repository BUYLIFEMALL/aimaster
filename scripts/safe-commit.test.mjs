// 안전 커밋 도우미(scripts/safe-commit.mjs) 자동 시험 — 2026-10-23 (Claude Code 윈도우)
// 매 시나리오마다 빈 임시 저장소를 만들고 지금의 safe-commit.mjs를 복사해 실제로 실행한다(이 저장소는 건드리지 않음).
// 실행: node --test scripts/safe-commit.test.mjs
// 배경: 겹친 구역 자동 풀이가 줄 순서를 바꾸던 결함(A B C D2 E2 F2 → A B E2 F2 C D2)을 고친 뒤, 같은 결함이 다시 들어오지 않게 남김.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync, utimesSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { assertScratchRepo } from "./assert-scratch-repo.mjs"; // 실제 저장소에서 시험이 돌면 즉시 실패(2026-10-23 시험 커밋 사고 재발 방지)

// 다른 판(예: 고치기 전)을 시험하려면 SAFE_COMMIT_HELPER=<파일 경로>
const HELPER = process.env.SAFE_COMMIT_HELPER || join(dirname(fileURLToPath(import.meta.url)), "safe-commit.mjs");

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "safe-commit-test-"));
  mkdirSync(join(dir, "scripts"));
  copyFileSync(HELPER, join(dir, "scripts", "safe-commit.mjs"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  assertScratchRepo(dir); // git이 보는 최상위가 임시 폴더인지 — 아니면 여기서 멈춤
  git("config", "user.email", "t@t"); git("config", "user.name", "t"); git("config", "core.autocrlf", "false");
  const write = (f, lines) => writeFileSync(join(dir, f), lines.join("\n") + "\n");
  const read = (f) => readFileSync(join(dir, f), "utf8");
  const head = (f) => git("show", `HEAD:${f}`).trimEnd().split("\n");
  // 세션 이름이 필수라(2026-10-23) 기본으로 시험용 이름을 넣는다(--as를 주면 그쪽이 우선)
  const helper = (...a) => spawnSync(process.execPath, ["scripts/safe-commit.mjs", ...a], { cwd: dir, encoding: "utf8", env: { ...process.env, AIMASTER_SESSION: "claude-test" } });
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

// 2026-10-23: --mine 이진 파일·삭제 커밋(일반 파일도 도우미로 커밋 — 경로 지정 커밋이 공용 스테이징을 줄이던 사고 대책)
const bin = (n) => Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, n, 0xff, 0x00, 0x10]);
test("⑤ --mine 이진 새 파일: 바이트 그대로 커밋된다", () => {
  const r = repo();
  try {
    r.commit("a.md", ["a"], "c1");
    writeFileSync(join(r.dir, "x.zip"), bin(1));
    const out = r.helper("이진 추가", "x.zip", "--mine");
    assert.equal(out.status, 0, out.stdout + out.stderr);
    const got = execFileSync("git", ["show", "HEAD:x.zip"], { cwd: r.dir });
    assert.deepEqual([...got], [...bin(1)]);
  } finally { r.done(); }
});

test("⑥ --mine 이진 수정: 새 바이트로 바뀌고, 같은 내용이면 커밋하지 않는다", () => {
  const r = repo();
  try {
    writeFileSync(join(r.dir, "x.zip"), bin(1)); r.git("add", "x.zip"); r.git("commit", "-qm", "c1");
    writeFileSync(join(r.dir, "x.zip"), bin(2));
    assert.equal(r.helper("이진 수정", "x.zip", "--mine").status, 0);
    assert.deepEqual([...execFileSync("git", ["show", "HEAD:x.zip"], { cwd: r.dir })], [...bin(2)]);
    const before = r.git("rev-parse", "HEAD").trim();
    const out = r.helper("같은 내용", "x.zip", "--mine");
    assert.equal(out.status, 0);
    assert.equal(r.git("rev-parse", "HEAD").trim(), before, "같은 내용인데 커밋됨");
  } finally { r.done(); }
});

test("⑦ --mine 삭제: 지금 없는 파일이 최신 커밋에서 빠지고, 다른 파일은 그대로", () => {
  const r = repo();
  try {
    r.commit("keep.md", ["k"], "c1");
    writeFileSync(join(r.dir, "old.zip"), bin(3)); r.git("add", "old.zip"); r.git("commit", "-qm", "c2");
    rmSync(join(r.dir, "old.zip"));
    const out = r.helper("옛 파일 삭제", "old.zip", "--mine");
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.equal(r.git("ls-tree", "HEAD", "--name-only").trim().split("\n").sort().join(","), "keep.md");
    assert.equal(r.git("ls-files").trim(), "keep.md", "공용 스테이징도 맞춰져야 함");
  } finally { r.done(); }
});

test("⑧ 이진 파일을 --mine 없이: 거부하고 커밋하지 않는다", () => {
  const r = repo();
  try {
    writeFileSync(join(r.dir, "x.zip"), bin(1)); r.git("add", "x.zip"); r.git("commit", "-qm", "c1");
    assert.equal(r.helper("--begin", "x.zip", "--as", "me").status, 0);
    writeFileSync(join(r.dir, "x.zip"), bin(4));
    const before = r.git("rev-parse", "HEAD").trim();
    const out = r.helper("이진", "x.zip", "--as", "me");
    assert.notEqual(out.status, 0, "이진인데 병합 커밋됨: " + out.stdout);
    assert.equal(r.git("rev-parse", "HEAD").trim(), before);
  } finally { r.done(); }
});

// 2026-10-23 14:00 사고 대책: 공용 스테이징 맞추기 단계의 도우미 전용 잠금
test("⑨ 다른 도우미가 잠금을 잡고 있으면: 커밋은 하고 스테이징 맞추기는 건너뛴다(남의 잠금은 그대로)", () => {
  const r = repo();
  try {
    r.commit("a.md", ["a"], "c1");
    const lock = join(r.dir, ".git", "safe-commit-index.lock");
    writeFileSync(lock, "9999 다른 도우미");
    r.write("a.md", ["a", "b"]);
    const out = spawnSync(process.execPath, ["scripts/safe-commit.mjs", "커밋", "a.md", "--mine"], { cwd: r.dir, encoding: "utf8", env: { ...process.env, AIMASTER_SESSION: "claude-test", SAFE_COMMIT_SYNC_TRIES: "2" } });
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /공용 스테이징 맞추기를 건너뜁니다/);
    assert.deepEqual(r.head("a.md"), ["a", "b"]);
    assert.equal(readFileSync(lock, "utf8"), "9999 다른 도우미");
  } finally { r.done(); }
});

test("⑩ 2분 넘은 잠금은 치우고 정상으로 맞춘다", () => {
  const r = repo();
  try {
    r.commit("a.md", ["a"], "c1");
    const lock = join(r.dir, ".git", "safe-commit-index.lock");
    writeFileSync(lock, "1 끊긴 도우미");
    const old = new Date(Date.now() - 5 * 60 * 1000); utimesSync(lock, old, old);
    r.write("a.md", ["a", "c"]);
    const out = r.helper("커밋", "a.md", "--mine");
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.doesNotMatch(out.stdout, /건너뜁니다/);
    assert.equal(r.git("show", ":a.md").trimEnd(), "a\nc", "공용 스테이징도 새 내용");
    assert.equal(existsSync(lock), false);
  } finally { r.done(); }
});

test("⑪ 공용 스테이징이 이미 줄어 있으면: 더 쓰지 않고 알린다", () => {
  const r = repo();
  try {
    for (const f of ["a.md", "b.md", "c.md", "d.md"]) r.write(f, [f]);
    r.git("add", "."); r.git("commit", "-qm", "c1");
    r.git("rm", "-q", "--cached", "b.md", "c.md", "d.md");   // 스테이징 축소 흉내
    const before = r.git("ls-files").trim();
    r.write("a.md", ["a2"]);
    const out = r.helper("커밋", "a.md", "--mine");
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /이미 줄어 있습니다/);
    assert.equal(r.git("ls-files").trim(), before, "줄어든 스테이징을 건드리지 않음");
  } finally { r.done(); }
});

test("세션 이름이 없으면 --begin·커밋 모두 거부(2026-10-23 주인님 결정)", () => {
  const r = repo();
  try {
    r.commit("a.md", ["a"], "c1");
    const env = { ...process.env }; delete env.AIMASTER_SESSION;
    const run = (...a) => spawnSync(process.execPath, ["scripts/safe-commit.mjs", ...a], { cwd: r.dir, encoding: "utf8", env });
    const begin = run("--begin", "a.md");
    assert.equal(begin.status, 2, begin.stdout + begin.stderr);
    assert.match(begin.stderr, /세션 이름이 없습니다/);
    r.write("a.md", ["a", "b"]);
    const out = run("커밋", "a.md");
    assert.equal(out.status, 2, out.stdout + out.stderr);
    assert.deepEqual(r.head("a.md"), ["a"], "커밋되지 않음");
  } finally { r.done(); }
});

test("고친 뒤 다시 --begin 하면 막고(기준 사본 그대로), --force-begin만 새로 뜬다(2026-10-23)", () => {
  const r = repo();
  try {
    r.commit("a.md", ["a"], "c1");
    assert.equal(r.helper("--begin", "a.md", "--as", "me").status, 0);
    r.write("a.md", ["a", "내 수정"]);
    const again = r.helper("--begin", "a.md", "--as", "me");
    assert.equal(again.status, 1, again.stdout + again.stderr);
    assert.match(again.stderr, /이미 고친 파일입니다/);
    const out = r.helper("내 커밋", "a.md", "--as", "me");
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.deepEqual(r.head("a.md"), ["a", "내 수정"], "막힌 덕분에 내 수정이 커밋됨");
    // 커밋 뒤에는 기준 사본이 지워져 다음 작업의 --begin은 그대로 됨, 고치기 전 다시 --begin도 됨
    assert.equal(r.helper("--begin", "a.md", "--as", "me").status, 0);
    assert.equal(r.helper("--begin", "a.md", "--as", "me").status, 0);
    r.write("a.md", ["a", "내 수정", "또"]);
    assert.equal(r.helper("--begin", "a.md", "--as", "me", "--force-begin").status, 0);
  } finally { r.done(); }
});
