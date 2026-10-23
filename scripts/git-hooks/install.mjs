// scripts/git-hooks/pre-commit을 .git/hooks/pre-commit으로 설치한다(2026-10-20). 이미 다른 훅이 있으면 덮어쓰지 않고 알린다.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const gitDir = path.resolve(root, execFileSync("git", ["rev-parse", "--git-dir"], { cwd: root, encoding: "utf8" }).trim());
const src = path.join(root, "scripts", "git-hooks", "pre-commit");
const dest = path.join(gitDir, "hooks", "pre-commit");
const mark = "AIMaster 커밋 직전 알림";
if (fs.existsSync(dest) && !fs.readFileSync(dest, "utf8").includes(mark)) {
  console.error(`이미 다른 pre-commit 훅이 있어 덮어쓰지 않았습니다: ${dest}\n그 훅 끝에 다음 줄을 직접 추가하세요: node "$(git rev-parse --show-toplevel)/scripts/check-openai-models.mjs" --staged || true`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
try { fs.chmodSync(dest, 0o755); } catch { /* 윈도우는 권한 비트 없음 */ }
console.log(`설치했습니다: ${dest}`);
