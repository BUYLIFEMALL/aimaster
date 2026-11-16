# WS-20261116-03 결과 — v1.52 운영 회귀 확인 (CC-WORKSPACE-01)

- 담당: Claude(Workspace) `CC-WORKSPACE-01` · 세션 `claude-win-20261025-workspace`
- 지시: Master `msg_62e615e2c4b9` (WS-20261116-03)
- 상태: **ready_review** (done 판정은 Master)
- 날짜: 2026-11-16

## 1. 정확한 배포 기준

| 항목 | 값 |
|---|---|
| 배포 | `ai-work-workspace-tm8aegejd` (`dpl_9kAszJvHDf7ghyDJTW1xJutYdzug`), production, Ready |
| 배포 시각 | 2026-11-16 15:44:42 KST |
| 별칭 | `ai-work-workspace.buylife.xyz` |
| 배포 방식 | CLI 업로드(Git 연동 없음) — 배포 자체에는 git SHA가 기록되지 않음 |
| 배포 소스와 같은 커밋 | `0ea89b520` (15:47:30 커밋, 배포 3분 뒤) — 배포 당시 작업본은 `d8290ffb6` 소스 + `src/lib/version.ts` v1.52 한 줄이었고, 그 한 줄이 `0ea89b520`에 커밋됨. 이후 `ai-work-workspace/` 변경 없음(`git diff 0ea89b520 HEAD -- ai-work-workspace` 비어 있음, 미커밋 없음) |
| 포함 커밋 | `49c8011cd`(한국어화) · `270f87b20`(에이전트 MCP 열기) · `d8290ffb6`(승인 1회 소진) |

## 2. 승인 사용 증거 (별도 1회)

- 빌드 1회: 주인님 「진행해」(에이전트 MCP 구현 + 빌드 1회 승인) → 주인님 「배포 진행해」로 실행. 위 배포 1건이 그 1회이며, 이 작업(WS-03)에서는 **빌드·배포 0회**.
- DB 쓰기: 배포 때 `programs.version='v1.52'` 1건(같은 승인 범위). 이 작업에서는 0건.
- QA 독립 검토 전에 주인님 지시로 배포한 사실은 앞 보고에서 알림. 독립 검토는 Music(MUS-20261116-03, `8099c5ea5`: 치명 결함 없음·권고 3)으로 진행됨.

## 3. 운영 확인 (시험 계정 `buylifemall@naver.com`, ego lite 작업 공간 1개, 끝나고 닫음)

로그인 계정은 화면 계정 표시로 확인(시험 계정 하나만 보임). 명령은 **없는 에이전트 번호**(`00000000-0000-4000-8000-000000000000`)로 보내 바깥 호출·저장 전에 끝나게 했음 → 운영 데이터 변경 없음.

| 명령 | 기대 | 실제 응답 | 판정 |
|---|---|---|---|
| `addAgentConnection` | 단계 차단 없음 | 404 `ValidationError` 「에이전트를 찾을 수 없습니다.」 | 열림 ✅ |
| `refreshAgentConnection` | 단계 차단 없음 | 404 같은 응답 | 열림 ✅ |
| `updateAgentConnection` | 단계 차단 없음 | 404 같은 응답 | 열림 ✅ |
| `removeAgentConnection` | 단계 차단 없음 | 404 같은 응답 | 열림 ✅ |
| `getAgentSharing` | 닫힘 | 403 `PermissionError` 「이 기능은 아직 준비 중입니다…」 | 닫힘 유지 ✅ |
| `mcpListPresets` | 닫힘 | 403 `PermissionError` 같은 문구 | 닫힘 유지 ✅ |

근거: 서버는 `runRpc`(`src/server/runtime.ts:179`)에서 명령 이름 단계 차단을 입력 검사보다 먼저 하므로, 4개가 403이 아니라 핸들러의 「에이전트 없음」까지 갔다는 것이 열림의 증거다.

화면·매뉴얼:
- 본 화면 왼쪽 메뉴 버전 **v1.52**.
- `/guide` 버전 **v1.52**, 「맞춤 비서(정시 실행)에도 바깥 MCP」 안내 있음 — 「읽기 도구만 혼자 실행」「검토 필요」「하루 500번」 문구 확인.

## 4. 매뉴얼 안내 ↔ 실제 서버 규칙 대조 (정적)

| 매뉴얼 문구 | 서버 코드 | 일치 |
|---|---|---|
| 혼자 실행(정시·이벤트)에서는 쓰기·삭제 도구를 「항상 허용」이어도 실행하지 않고 「검토 필요」 | `agents/tools.ts` `mcpTool`: `needsApproval = m.mode === 'ask' \|\| (!ctx.interactive && !m.tool.readOnly)` → 비대화 실행이면 `ctx.review` 설정 후 멈춤 | ✅ |
| 「허용」을 누르면 그 호출 한 번만 다시 실행 | `approvedCalls.delete` + `consumeApproval`(실행 기록 조건부 소진, 실패 시 다시 검토 필요) | ✅ |
| 회원당 하루 500번, 혼자 실행은 비서 만든 회원·대화 중엔 대화 회원 기준 | `aimasterMcpGuard.ts` `MCP_CALLS_PER_DAY = 500`, `meter = (interactive && actorId) \|\| agent.created_by_id \|\| bot_id` → `callMcpTool(..., meter)` | ✅ |
| 비서 공유·공용 MCP 목록은 아직 못 씀 | `stagePolicy.ts` `AGENT_CLOSED_RPCS`·`mcp*` 접두(열린 목록 외) 차단, 위 3절 운영 응답 | ✅ |

권고(코드 변경 없음, 다음 문구 정리 후보): 매뉴얼의 「읽기 도구만 혼자 실행」은 회원이 읽기 도구를 「항상 묻기」로 둔 경우에도 멈춘다는 점(`m.mode === 'ask'`)과, 도구가 읽기 전용 표시(`readOnlyHint`)를 안 달면 쓰기로 보고 멈춘다는 점을 적지 않음 — 둘 다 안전한 쪽이라 결함은 아님.

## 5. 하지 않은 것 (미실행 범위)

- 실제 바깥 MCP 서버 연결 추가·쓰기 호출·AI 호출·정시 실행 트리거: **하지 않음**(지시대로). 혼자 실행의 「검토 필요」 멈춤·「허용」 1회 소진은 **작성자 시험**(`tests/integration/agentMcp.test.ts`, 시험 202개 통과, 가짜 MCP 응답)으로만 확인했고 운영 실호출 증거는 없음.
- 코드·빌드·배포·환경변수·운영 DB 쓰기: 0건.
- 구분: 3절 = 운영 확인 / 4절 = 정적 대조 / 위 첫 줄 = 작성자 시험.

## 6. 문서

- `docs/roles/workspace.md`: 마지막 갱신·지금 하는 일·최근 완료(v1.52) 갱신.
- `docs/ACTIVE_WORK.md`: 옛 v1.41 줄만 현재 상태로 바꿈(다른 행 손대지 않음).

## 7. 알릴 점

- 브라우저: 이 세션의 지정 브라우저는 엣지(주인님 지정 2026-11-15)인데, v1.52 배포 확인과 이번 확인을 **ego lite**로 했음(작업 공간 1개씩 열고 닫음). 다음 확인부터는 엣지로 돌아감.

## 비용
없음(빌드 0·AI 0·DB 쓰기 0).
