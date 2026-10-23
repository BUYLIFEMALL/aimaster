// scripts/git-hooks/pre-commit·pre-push를 .git/hooks/로 설치한다(2026-10-20, pre-push는 2026-10-23). 이미 다른 훅이 있으면 덮어쓰지 않고 알린다.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const gitDir = path.resolve(root, execFileSync("git", ["rev-parse", "--git-dir"], { cwd: root, encoding: "utf8" }).trim());
// 2026-10-23: pre-push(대량 삭제 차단)도 함께 설치한다.
for (const [name, mark] of [["pre-commit", "AIMaster 커밋 직전 알림"], ["pre-push", "AIMaster 푸시 직전 검사"]]) {
  const src = path.join(root, "scripts", "git-hooks", name);
  const dest = path.join(gitDir, "hooks", name);
  if (fs.existsSync(dest) && !fs.readFileSync(dest, "utf8").includes(mark)) {
    console.error(`이미 다른 ${name} 훅이 있어 덮어쓰지 않았습니다: ${dest}
그 훅 끝에 scripts/git-hooks/${name}의 검사 줄을 직접 추가하세요.`);
    process.exitCode = 1;
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  try { fs.chmodSync(dest, 0o755); } catch { /* 윈도우는 권한 비트 없음 */ }
  console.log(`설치했습니다: ${dest}`);
}
