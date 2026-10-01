// Claude Code SessionStart 훅 — 클라우드 세션(Claude Code on the web)일 때만 작업 규칙을 상기시킨다(2026-10-01).
// 로컬 세션에서는 아무것도 출력하지 않는다. 규칙 원문: docs/CLOUD_SESSION.md
import { execSync } from 'node:child_process'

const isCloud = process.env.CLAUDE_CODE_REMOTE === 'true'
if (!isCloud) process.exit(0)

let branch = ''
try {
  branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim()
} catch {
  branch = '(확인 실패)'
}

const lines = [
  '[AIMaster 클라우드 세션] docs/CLOUD_SESSION.md 규칙을 따른다.',
  `- 현재 브랜치: ${branch}${branch === 'cloud-work' ? '' : '  ← cloud-work가 아님! 작업 전에 git fetch origin && git checkout cloud-work'}`,
  '- 커밋·푸시는 cloud-work에만(master 직접 푸시 금지). 시작 시 git merge origin/master로 로컬 최신 지침·코드를 받는다.',
  '- 클라우드에서 하지 않는 것: vercel 배포, 버전 올리기(코드·DB), DB 쓰기, 비밀값 입력 → 로컬 병합 때 처리.',
  '- 먼저 읽기: PROGRESS.md → docs/HANDOFF.md → docs/ERROR_LESSONS.md → 서브프로젝트 AGENTS.md. 답변은 쉬운 한글 존댓말, 호칭 "주인님".',
]

process.stdout.write(
  JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: lines.join('\n') } }),
)
