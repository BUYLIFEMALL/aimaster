// 실행: node --test claude-plugins/aimaster-dev/scripts/guard.test.js
const test = require("node:test");
const assert = require("node:assert");
const { checkBash, checkFile } = require("./guard.js");
const d = (c) => (checkBash(c) || {}).decision || null;

test("막는 git 명령", () => {
  for (const c of [
    "git add -A", "git add .", "cd x && git add --all", "git commit -m 'x'", "git commit -am 'x'",
    "git commit -m \"x\" --", "git commit --no-verify -m x -- a.ts", "git push --no-verify",
    "git reset --hard HEAD~1", "git stash", "git stash pop", "git checkout .", "git restore .",
    "git -C sub add .", "FOO=1 git add -A", "rm -f .git/index.lock", "rm .git/index",
  ]) assert.strictEqual(d(c), "deny", c);
});

test("확인을 묻는 명령", () => {
  for (const c of ["git push --force origin x", "git push --force-with-lease", "git push -f", "AIMASTER_ALLOW_MASS_DELETE=1 git commit -m x -- a"])
    assert.strictEqual(d(c), "ask", c);
});

test("통과하는 명령", () => {
  for (const c of [
    "git add src/a.ts docs/b.md", "git commit -m \"fix: git add . 금지 안내\" -- src/a.ts", "git commit -m 'x' -- \"my file.ts\"",
    "git status --porcelain -- app", "git stash list", "git checkout cloud-work", "git checkout -- a.ts", "git push -u origin cloud-work",
    "git reset -q HEAD -- a.ts", "git commit-tree abc -m x", "node scripts/commit-paths.mjs \"msg\" a.ts --as s --push",
    "echo \"git add -A 는 금지\"", "git log --oneline -5 | head -3", "git commit --amend -m x -- a.ts",
    "cat <<'EOF' > notes.md\ngit add -A\ngit reset --hard\nEOF",
  ]) assert.strictEqual(d(c), null, c);
});

test(".env 덮어쓰기", () => {
  assert.strictEqual(d("echo \"담당께: …\" > mall-builder/.env.local"), "deny");
  assert.strictEqual(d("echo A=1 > .env"), "deny");
  assert.strictEqual(d("cat x | tee .env.production"), "deny");
  assert.strictEqual(d("echo A=1 >> .env.local"), null);
  assert.strictEqual(d("echo A=1 | tee -a .env.local"), null);
  assert.strictEqual(d("cp .env.example out.txt && echo x > .env.example"), null);
  assert.strictEqual(d("sed -E 's/=.*/=<숨김>/' .env.local"), null);
  assert.strictEqual(d("node x.js 2>&1 > log.txt"), null);
});

test("파일 도구", () => {
  assert.strictEqual(checkFile("Write", __filename), null);
  assert.strictEqual(checkFile("Write", "/nonexistent/.env.local").decision, "ask");
  assert.strictEqual(checkFile("Edit", "app/.env").decision, "ask");
  assert.strictEqual(checkFile("Edit", "app/.env.example"), null);
  assert.strictEqual(checkFile("Write", "docs/env.md"), null);
});
