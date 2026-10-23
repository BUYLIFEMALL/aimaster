// 저장소 대량 삭제 차단(2026-10-23 사고 재발 방지) — 공용 스테이징(.git/index)이 쪼그라든 채 커밋·푸시돼
// 원격 master에서 파일 10,471개가 지워진 사고(c2e7c4db2, 복구 237741cc3) 뒤 만든 검사. 루트 CLAUDE.md 최상단 「저장소 대량 삭제 사고」.
//   --staged : pre-commit 훅. 이번 커밋이 파일을 LIMIT개 넘게 지우거나, 스테이징 파일 수가 HEAD의 절반 아래면 커밋을 막는다.
//   --push   : pre-push 훅. 올릴 커밋 중 하나라도 파일을 LIMIT개 넘게 지우거나 트리 파일 수가 절반 아래로 줄면 푸시를 막는다.
// 주인님이 승인한 실제 대량 삭제(프로그램 폐지 등)만 AIMASTER_ALLOW_MASS_DELETE=1 로 통과시킨다.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const LIMIT = 50;
const git = (args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim();
const count = (text) => (text ? text.split("\n").filter(Boolean).length : 0);
const treeCount = (rev) => count(git(["ls-tree", "-r", "--name-only", rev]));
const allowed = process.env.AIMASTER_ALLOW_MASS_DELETE === "1";
const mode = process.argv[2];
const problems = [];

if (mode === "--staged") {
  let headCount = 0;
  try { headCount = treeCount("HEAD"); } catch { process.exit(0); } // 첫 커밋 등
  const indexCount = count(git(["ls-files"]));
  const deleted = count(git(["diff", "--cached", "--name-only", "--diff-filter=D"]));
  if (deleted > LIMIT) problems.push(`이번 커밋이 파일 ${deleted}개를 지웁니다(기준 ${LIMIT}개).`);
  if (headCount > 200 && indexCount < headCount / 2) problems.push(`공용 스테이징 파일 수 ${indexCount}개가 HEAD ${headCount}개의 절반보다 적습니다 — 스테이징(.git/index)이 망가졌을 수 있습니다.`);
} else if (mode === "--push") {
  const zero = /^0+$/;
  for (const line of readFileSync(0, "utf8").split("\n").filter(Boolean)) {
    const [, localSha, , remoteSha] = line.split(" ");
    if (!localSha || zero.test(localSha)) continue; // 브랜치 삭제 푸시
    const range = !remoteSha || zero.test(remoteSha) ? [localSha, "--not", "--remotes"] : [`${remoteSha}..${localSha}`];
    for (const sha of git(["rev-list", ...range]).split("\n").filter(Boolean)) {
      let parentCount = 0;
      try { parentCount = treeCount(`${sha}^`); } catch { continue; }
      const deleted = count(git(["diff", "--name-only", "--diff-filter=D", `${sha}^`, sha]));
      const after = treeCount(sha);
      if (deleted > LIMIT || (parentCount > 200 && after < parentCount / 2)) {
        problems.push(`커밋 ${sha.slice(0, 9)} 「${git(["log", "-1", "--format=%s", sha])}」: 파일 ${deleted}개 삭제, 트리 ${parentCount} → ${after}개.`);
      }
    }
  }
} else {
  console.error("사용법: node scripts/check-index-health.mjs --staged | --push");
  process.exit(0);
}

if (!problems.length) process.exit(0);
const head = mode === "--staged" ? "커밋을" : "푸시를";
console.error(`\n⛔ [대량 삭제 차단] ${head} 멈췄습니다.\n- ${problems.join("\n- ")}`);
if (allowed) { console.error("AIMASTER_ALLOW_MASS_DELETE=1 이 있어 통과시킵니다(주인님이 승인한 삭제만).\n"); process.exit(0); }
console.error(`다음을 확인하세요(루트 CLAUDE.md 최상단 「저장소 대량 삭제 사고」):
  git ls-files | wc -l          # 정상은 약 1만 개
  git ls-tree -r HEAD | wc -l
  git diff --cached --stat | tail -1
스테이징이 망가졌으면 커밋·푸시하지 말고 주인님께 알리세요. 직접 고치거나 지우지 않습니다.
주인님이 승인한 실제 대량 삭제만: AIMASTER_ALLOW_MASS_DELETE=1 git ${mode === "--staged" ? "commit" : "push"} ...\n`);
process.exit(1);
