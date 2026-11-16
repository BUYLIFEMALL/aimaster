# WS-20261116-08 결과 — 승인 키 객체 키 순서 무관화 (CC-WORKSPACE-01)

- 담당: Claude(Workspace) `CC-WORKSPACE-01` · 지시: Master `msg_ecafbb457242`
- 상태: **ready_review** · 배포: 미배포 대기(다음 배포 묶음) · 운영지침 v1.1 형식
- 선행 처리: `docs/ACTIVE_WORK.md` 내 workspace 행을 v1.53·WS-07 완료·WS-08 진행으로 갱신(`2a612859b`)

## 1. 호환 방식 (구현 전 정리, 허용 범위 안이라 진행)

- 사용처: `callKey`는 `agents/tools.ts` `mcpTool`(호출 시 키 계산)과 `agents/runs.ts:884` `decideRunReview`(허용 때 `review.input`으로 키 저장)에서만 쓰임. 둘 다 같은 함수라 `tools.ts`만 바꾸면 양쪽이 같이 새 형식이 됨 → **다른 파일·모듈·스키마 불필요**.
- 새 형식: `callKey = connectionId:tool:` + 객체 키를 깊이까지 정렬한 JSON. 배열 순서·값·타입은 그대로(배열 순서가 다르면 다른 호출). `Object.fromEntries`로 만들어 `__proto__` 키도 일반 속성으로 보존. 접두(`connectionId:tool:`)는 기존과 같아 다른 연결·도구와 섞이지 않음.
- 기존 데이터 호환:
  - 배포 전 멈춰 있던 **검토 대기**(pending) → 배포 뒤 허용하면 새 형식으로 저장되고 호출도 새 형식 → 맞음.
  - 배포 전 이미 **허용돼 payload에 남은 승인**(옛 형식 문자열) → `legacyCallKey`(옛 방식)로 **같은 입력·같은 순서일 때만** 인정. 새 형식 키를 먼저 찾고 없을 때만 옛 키를 찾아 **그 하나만** 기존 조건부 소진(`consumeApprovedCall`, CAS)으로 지움 → 한 호출이 승인 2개를 쓰거나 같은 승인이 두 번 쓰이지 않음. 순서가 다른 옛 승인은 맞추지 않음(막는 쪽, 다시 검토).
- 유지: 승인 1회 소진·CAS·무인 검토 판정(WS-05 포함)·대화 중 정책 변경 없음.

## 2. 변경 (실제 산출물 SHA는 Master 보고에 `git log -1 -- <경로>` 기준으로 적음)

| 파일 | 내용 |
|---|---|
| `ai-work-workspace/src/litpage/server/agents/tools.ts` | `canonicalJson`(내부)·`callKey` 정렬 직렬화·`legacyCallKey`(호환), `mcpTool` 승인 찾기 새 키 → 옛 키 순 |
| `ai-work-workspace/tests/integration/agentMcp.test.ts` | 시험 3개: 키 동일/구분 표(중첩 정렬·배열 순서·값·타입·연결·도구·`__proto__`), 허용 뒤 키 순서 바뀐 다시 실행 1회만(실제 시험 DB), 옛 형식 승인 같은 순서만 1회·다른 값/순서 불인정(실제 시험 DB) |
| `ai-work-workspace/docs/IMPROVEMENTS.md` | 후보 줄을 「처리(미배포)」로 |

## 3. 검증

| 항목 | 결과 |
|---|---|
| 시험 전 공유 DB 점유 | `aww-pg-test` 다른 접속 0, 실행 중 vitest 0 확인 |
| `agentMcp.test.ts` + `agentU12.test.ts` | 27/27 통과(`agentMcp` 18) |
| 고치기 전 키 방식으로 잠시 되돌림 | 새 시험 2개 실패(키 표·키 순서 다시 실행) → 복원 뒤 18/18 |
| 기존 회귀(승인 1회·CAS 동시·무인 검토·모순 도구·대화 중) | 같은 실행에서 모두 통과 |
| `npx tsc --noEmit` | 통과 |

미검수: 운영(미배포), 실제 MCP 호출(가짜 응답만), 전체 시험 205+(이번엔 관련 2파일만).

## 4. 남은 것·다음 단계
- 다음 배포 때 함께(빌드는 주인님 승인 필요). 배포 후 운영에서 옛 형식 승인이 남은 실행이 있는지는 DB 읽기로만 확인 가능(지금은 지시 범위 밖).
- 다른 후보: 실행 기록 이름 「Ran MCP tool: 도구명」 한국어화(지시 필요), 11-17 볼타 시험 인증서 알림 확인.

## 비용
없음(빌드 0·AI 0·운영 DB 0·실 MCP 0).
