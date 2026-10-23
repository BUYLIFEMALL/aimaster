// scripts/git-hooks/pre-commit·pre-push를 .git/hooks/로 설치한다(2026-10-20, pre-push는 2026-10-23). 이미 다른 훅이 있으면 덮어쓰지 않고 알린다.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const gitDir = path.resolve(root, execFileSync("git", ["rev-parse", "--git-dir"], { cwd: root, encoding: "utf8" }).trim());
// 2026-10-23: pre-push(대량 삭제 차단)도 함께 설치한다.
// 머리말 글자로 「우리 훅」인지 알아본다 — 2026-10-23 pre-commit 머리말이 「알림」→「검사」로 바뀌어 둘 다 받는다(옛 글자만 보면 교체를 거부했음)
// 2026-10-23: commit-msg(AIMASTER_SESSION → 커밋 메시지 세션 트레일러)도 함께 설치한다.
for (const [name, marks] of [["pre-commit", ["AIMaster 커밋 직전 검사", "AIMaster 커밋 직전 알림"]], ["pre-push", ["AIMaster 푸시 직전 검사"]], ["commit-msg", ["AIMaster 커밋 메시지 세션"]]]) {
  const src = path.join(root, "scripts", "git-hooks", name);
  const dest = path.join(gitDir, "hooks", name);
  if (fs.existsSync(dest) && !marks.some((m) => fs.readFileSync(dest, "utf8").includes(m))) {
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
