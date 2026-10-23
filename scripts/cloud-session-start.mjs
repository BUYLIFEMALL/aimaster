// Claude Code SessionStart 훅 — 클라우드 세션(Claude Code on the web)일 때만 작업 규칙을 상기시킨다(2026-10-01).
// 로컬 세션에서는 아무것도 출력하지 않는다. 규칙 원문: docs/CLOUD_SESSION.md
import { execSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const isCloud = process.env.CLAUDE_CODE_REMOTE === 'true'
if (!isCloud) {
  // 로컬 세션(윈도우·맥미니 공통, 2026-10-23): 공용 스테이징 블랙박스에 한 줄 — 잠금이 5분 넘게 남았으면 「이 장비」의 프로세스를
  // .git/aimaster-lock-evidence.txt에 남긴다(맥미니에서 생긴 잠금은 윈도우에서 프로세스를 볼 수 없어서). ⚠가 있을 때만 세션에 알린다.
  if (existsSync('scripts/index-watch.mjs')) {
    try {
      const r = spawnSync(process.execPath, ['scripts/index-watch.mjs', 'claude-session-start', '--quiet', '--warn-lock'], { encoding: 'utf8', timeout: 8000 })
      const warn = `${r.stdout || ''}${r.stderr || ''}`.split('\n').filter((l) => l.startsWith('⚠') || l.startsWith('  정리'))
      if (warn.length) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: ['[공용 스테이징 블랙박스 — 커밋·푸시 전에 확인(루트 CLAUDE.md 최상단)]', ...warn].join('\n') } }))
    } catch { /* 기록 실패는 무시 */ }
  }
  process.exit(0)
}

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
