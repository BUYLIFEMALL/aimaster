// 일반 커밋 도우미(scripts/commit-paths.mjs) 자동 시험 — 2026-10-23 (Claude Code 윈도우)
// 매 시나리오마다 빈 임시 저장소에 도우미와 대량 삭제 검사(check-index-health.mjs)를 복사해 실제로 실행한다(이 저장소는 건드리지 않음).
// 실행: node --test scripts/commit-paths.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync, utimesSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

function repo(fileCount = 0) {
  const dir = mkdtempSync(join(tmpdir(), "commit-paths-test-"));
  mkdirSync(join(dir, "scripts"));
  for (const f of ["commit-paths.mjs", "check-index-health.mjs"]) copyFileSync(join(HERE, f), join(dir, "scripts", f));
  const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t"); git("config", "user.name", "t"); git("config", "core.autocrlf", "false");
  mkdirSync(join(dir, "bulk"));
  for (let i = 0; i < fileCount; i++) writeFileSync(join(dir, "bulk", `f${i}.txt`), `${i}\n`);
  writeFileSync(join(dir, "keep.txt"), "keep\n");
  git("add", "-A"); git("commit", "-qm", "c1");
  const helper = (...a) => spawnSync(process.execPath, ["scripts/commit-paths.mjs", ...a], { cwd: dir, encoding: "utf8" });
  const tree = (rev = "HEAD") => git("ls-tree", "-r", "--name-only", rev).trim().split("\n").filter(Boolean);
  return { dir, git, helper, tree, done: () => rmSync(dir, { recursive: true, force: true }) };
}

test("① 새 파일·수정·삭제·바이너리를 폴더 경로 하나로 커밋", () => {
  const r = repo(3);
  try {
    mkdirSync(join(r.dir, "app"));
    writeFileSync(join(r.dir, "app", "new.txt"), "new\n");
    writeFileSync(join(r.dir, "app", "img.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 255]));
    r.git("add", "-A"); r.git("commit", "-qm", "app");
    writeFileSync(join(r.dir, "app", "new.txt"), "changed\n");
    rmSync(join(r.dir, "app", "img.png"));
    writeFileSync(join(r.dir, "app", "b.bin"), Buffer.from([0, 255, 0, 128]));
    const out = r.helper("app 정리", "app");
    assert.equal(out.status, 0, out.stdout + out.stderr);
    const t = r.tree();
    assert.ok(t.includes("app/new.txt") && t.includes("app/b.bin") && !t.includes("app/img.png"), t.join("|"));
    assert.equal(r.git("show", "HEAD:app/new.txt"), "changed\n");
    assert.deepEqual([...execFileSync("git", ["show", "HEAD:app/b.bin"], { cwd: r.dir })], [0, 255, 0, 128]); // 바이너리 그대로
    assert.ok(t.includes("keep.txt") && t.includes("bulk/f0.txt")); // 다른 파일 그대로
  } finally { r.done(); }
});

test("② 공용 스테이징이 망가져 있어도 다른 파일을 지우지 않고 커밋, 스테이징은 건드리지 않음", () => {
  const r = repo(30);
  try {
    const beforeCount = r.tree().length;               // bulk 30 + keep 1 + scripts 2
    r.git("read-tree", "--empty");                     // 공용 스테이징이 빈 상태(오늘 사고 흉내)
    writeFileSync(join(r.dir, "keep.txt"), "keep2\n");
    const out = r.helper("keep 수정", "keep.txt");
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.equal(r.tree().length, beforeCount);         // 다른 파일이 하나도 지워지지 않음
    assert.equal(r.git("show", "HEAD:keep.txt"), "keep2\n");
    assert.match(out.stdout, /건드리지 않았습니다/);
    assert.equal(r.git("ls-files").trim(), "");          // 공용 스테이징은 그대로(빈 상태)
  } finally { r.done(); }
});

test("③ 파일 50개 넘게 지우면 막는다", () => {
  const r = repo(60);
  try {
    const before = r.git("rev-parse", "HEAD").trim();
    rmSync(join(r.dir, "bulk"), { recursive: true, force: true });
    const out = r.helper("bulk 삭제", "bulk");
    assert.notEqual(out.status, 0, out.stdout);
    assert.equal(r.git("rev-parse", "HEAD").trim(), before);
  } finally { r.done(); }
});

test("⑤ 1시간 넘은 임시 스테이징 파일만 정리, 최근 것·공용 index는 그대로", () => {
  const r = repo(0);
  try {
    const old = join(r.dir, ".git", "index.commit-paths-99999"), fresh = join(r.dir, ".git", "index.commit-paths-99998");
    writeFileSync(old, "x"); writeFileSync(fresh, "y");
    const t = (Date.now() - 2 * 3600_000) / 1000;
    utimesSync(old, t, t);
    writeFileSync(join(r.dir, "keep.txt"), "k5\n");
    const out = r.helper("keep 수정", "keep.txt");
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.equal(existsSync(old), false);
    assert.equal(existsSync(fresh), true);
    assert.ok(existsSync(join(r.dir, ".git", "index")));
    assert.equal(readdirSync(join(r.dir, ".git")).filter((n) => n.startsWith(`index.commit-paths-`) && !n.endsWith("99998")).length, 0); // 내 임시 파일도 남지 않음
  } finally { r.done(); }
});

test("④ 공용 문서는 거부하고 안전 커밋 도우미로 안내", () => {
  const r = repo(0);
  try {
    mkdirSync(join(r.dir, "docs"));
    writeFileSync(join(r.dir, "docs", "HANDOFF.md"), "x\n");
    const out = r.helper("handoff", "docs/HANDOFF.md");
    assert.notEqual(out.status, 0);
    assert.match(out.stdout, /safe-commit/);
  } finally { r.done(); }
});
