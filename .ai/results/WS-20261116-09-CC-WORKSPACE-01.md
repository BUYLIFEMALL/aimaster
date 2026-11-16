# WS-20261116-09 결과 — 같은 실행의 동치 승인 함께 소진 (CC-WORKSPACE-01)

- 담당: Claude(Workspace) `CC-WORKSPACE-01` · 지시: Master `msg_0e081de7499d`(판정: 옛 승인 L 미실행 → 키 순서 변경으로 재검토 → 회원 재허용 C는 같은 논리 호출 재확인, 2회 승인 아님)
- 상태: **ready_review** · 배포: 미배포 대기(다음 배포 승인 없음) · 운영지침 v1.1 형식
- 허용 범위: `agents/tools.ts`·`agents/runs.ts`·`tests/integration/agentMcp.test.ts` (+ 본인 IMPROVEMENTS·이 결과). QA-06 원문은 건드리지 않음.

## 1. 완료 조건 ↔ 충족

| 조건 | 구현·근거 | 충족 |
|---|---|---|
| 같은 실행의 canonical 동치 legacy 키를 메모리·영속 payload에서 함께 제거, CAS 성공자만 실호출 1회 | `tools.ts` `mcpTool`: 쓸 수 있는지는 WS-08 그대로(새 키 또는 같은 순서 옛 키), 쓸 때 `approvalMatches`로 같은 실행 승인 집합의 동치 키를 모두 골라 메모리에서 지우고 `consumeApproval(keys)`. `runs.ts` `consumeApprovedCall(runId, string\|string[])`: 하나라도 남아 있으면 모두 지우는 한 번의 조건부 UPDATE(payload 그대로일 때만) | ✅ |
| 키 파싱 경계 | `approvalMatches`는 알려진 `connectionId:tool:` 접두로만 자르고 나머지 전체를 `JSON.parse` → 깊은 정렬 비교. 값 속 「:」·「__proto__」 영향 없음, 읽을 수 없는 키는 불일치 | ✅ |
| 기존 단일 legacy 키 동작 보존 | 옛 키 하나만 있을 때 같은 순서만 1회·다른 순서 불인정(WS-08 시험 그대로 통과) | ✅ |
| 새 스키마·빌드·배포·실 MCP 없음 | 없음 | ✅ |

## 2. 시험 (먼저 실패 → 수정)

새 시험 7개(`에이전트 바깥 MCP — 동치 승인 함께 소진`): 전제(L≠C) · L+C 공존 새 순서 먼저 1회 · 옛 순서 먼저 1회 · 다른 값/연결/도구 승인과 다른 실행 승인 보존 · 동시 2 worker 1회 · 실패 후 남은 동치 승인으로 재호출 안 함 + 다음 명시 새 승인 정상 1회 · 값 속 「:」/「__proto__」/읽을 수 없는 키/도구 이름 접두 경계.

| 단계 | 결과 |
|---|---|
| 수정 전 실행 | 5개 실패(공존 두 순서·보존·실패 후·파싱 경계), 동시 2 worker는 기존 CAS로 이미 통과 |
| 수정 후 `agentMcp`+`agentU12` | 34/34 |
| 수정 후 전체 | 28파일 215/215 |
| `npx tsc --noEmit` | 통과 |
| 공유 시험 DB 점유 | 실행 직전마다 `aww-pg-test` 다른 접속 0·실행 중 vitest 0 확인(3회) |

미검수: 운영(미배포), 실제 MCP(가짜 응답만). 알려진 한계: 연결 id나 도구 이름 자체에 「:」가 있어 `c:t` 접두가 다른 (연결, 도구) 쌍과 같아지는 경우는 기존 `callKey` 형식부터 같은 충돌이며 이번에 바꾸지 않음(연결 id는 생성값).

## 3. 산출물 SHA
Master 보고에 `git log -1 -- ai-work-workspace/src/litpage/server/agents/runs.ts` 기준으로 적음.

## 4. 다음 단계
- Master 독립 재검증(QA-06 원문 대비).
- 배포는 WS-04~09 묶음으로 주인님 승인 시.

## 비용
없음(빌드 0·AI 0·운영 DB 0·실 MCP 0).
