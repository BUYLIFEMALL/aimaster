# WS-20261116-05 결과 — 무인 실행 「삭제 가능」 표시 우선 (CC-WORKSPACE-01)

- 담당: Claude(Workspace) `CC-WORKSPACE-01` · 세션 `claude-win-20261025-workspace`
- 지시: Master `msg_457e99392b0a` · 점유 `.ai/FILE_OWNERSHIP.md` WS-20261116-05 줄
- 상태: **ready_review** · 배포: 미배포 대기(빌드·배포·실제 MCP·운영 DB 없음)

## 1. 먼저 확인한 것

- `destructive` 필드 전달: `ai/mcp.ts:197-198`이 서버 `tools/list`의 `annotations.destructiveHint`를 `McpTool.destructive`로 저장하고, `agents/tools.ts`의 `RunToolContext.mcp` 항목(`tool: McpTool`)이 그대로 받음. `mcpTool` 안에서 이미 `m.tool.destructive`를 읽고 있음(대화 중 승인 창 문구) → **다른 파일 수정 불필요**.
- 시험 DB 점유: 시험은 이 PC Docker `aww-pg-test`(127.0.0.1:55432)를 `reset: true`로 씀. 실행 직전 `pg_stat_activity`에 다른 접속 0, 실행 중인 vitest 프로세스 0 확인 뒤 실행.

## 2. 바꾼 것 (허용 범위 안)

| 파일 | 변경 |
|---|---|
| `ai-work-workspace/src/litpage/server/agents/tools.ts` | 판정 1줄 + 주석 1줄: `needsApproval = m.mode === 'ask' \|\| (!ctx.interactive && (!m.tool.readOnly \|\| !!m.tool.destructive))` |
| `ai-work-workspace/tests/integration/agentMcp.test.ts` | 회귀 시험 3개 추가(회원 없는 실행 묶음) |
| `ai-work-workspace/docs/IMPROVEMENTS.md` | 후보 줄을 「처리(미배포)」로 |

바꾸지 않은 것: 대화 중 정책(기본 모드 `t.readOnly ? 'auto' : 'ask'` 포함), `callKey`, 스키마, 다른 파일.

## 3. 시험

| 시험 | 결과 |
|---|---|
| 모순 도구(읽기+삭제 가능, 「바로 실행」 모드) 혼자 실행 → 호출 0·검토 필요 | 통과 |
| 모순 도구 「허용」 승인 → 1번만 실행, 같은 승인 두 번째는 다시 검토 필요 | 통과 |
| 삭제 가능 표시 없는 읽기 도구는 그대로 혼자 실행 | 통과 |
| 고치기 전 판정으로 잠시 되돌려 실행 | 새 시험 2개 실패(앞 2개) → 고친 코드로 복원 뒤 15/15 통과 |
| 기존 회귀(쓰기 도구 검토·승인 1회·읽기 혼자 실행·대화 중·실행 기록 승인 소진 5개) | `agentMcp.test.ts` 15/15 |
| 에이전트 일반(`agentU12.test.ts`) | 함께 24/24 |
| `npx tsc --noEmit` | 통과 |

전체 시험(202+3)은 지시대로 필요한 파일만 돌려 이번에는 실행하지 않음. 모두 작성자 시험이며 가짜 MCP 응답만 사용(실제 외부 호출 0).

## 4. 남은 것

- 매뉴얼 비서 MCP 줄(`src/app/guide/page.tsx`, WS-04에서 고친 줄)에 「삭제 가능 표시가 있는 도구도 혼자 실행에서는 멈춤」을 덧붙이는 것이 맞음 — 이번 허용 파일이 아니라 손대지 않음. 필요하면 다음 지시로.
- 대화 중에는 모순 도구가 기본 「바로 실행」(읽기 표시 기준)으로 남음 — 지시대로 이번 범위 밖.

## 비용
없음(빌드 0·AI 0·운영 DB 0).
