# WS-20261116-04 결과 — 매뉴얼 MCP 승인 안내 국소 보완 (CC-WORKSPACE-01)

- 담당: Claude(Workspace) `CC-WORKSPACE-01` · 세션 `claude-win-20261025-workspace`
- 지시: Master `msg_75c74c7eb8a9` (WS-03 검토 수락 + WS-04)
- 상태: **ready_review** · 배포: 미배포 대기(다음 배포 때 함께)

## 1. 바꾼 것 (허용 2파일만)

| 파일 | 내용 |
|---|---|
| `ai-work-workspace/src/app/guide/page.tsx` | 비서 MCP 안내 한 줄만 고침(아래 2절). AI 채팅 줄은 이미 코드와 같아 그대로 |
| `ai-work-workspace/docs/IMPROVEMENTS.md` | 미배포 대기에 이번 문구 수정 + 다음 국소 보강 후보 2건(근거만) |

코드·API·스키마·시험·빌드·배포·DB 쓰기: 0건. `npx tsc --noEmit` 통과. 문구만이라 새 시험 없음.

## 2. 안내 문구 ↔ 코드 근거

| 상황 | 매뉴얼에 쓴 내용 | 코드 근거 |
|---|---|---|
| AI 채팅 | 쓰기·삭제 도구는 승인 방식과 상관없이 항상 물어봄(기존 문구 유지) | `ai/service.ts` approve: `req.tool !== 'mcp' && !needsApproval(...)`일 때만 바로 허용 → MCP는 항상 확인 경로 |
| 비서와 대화 중 | 도구마다 고른 방식을 따름(기본: 읽기 바로 실행, 쓰기 「묻기」) | `agents/tools.ts:179` `modes[t.name] ?? (t.readOnly ? 'auto' : 'ask')`, 대화 중 `needsApproval = m.mode === 'ask'` |
| 정시·이벤트(혼자 실행) | 쓰기·삭제는 「항상 허용」이어도 「검토 필요」, 읽기도 「묻기」거나 읽기 표시가 없으면 멈춤 | `needsApproval = m.mode === 'ask' \|\| (!ctx.interactive && !m.tool.readOnly)` |
| 읽기 여부 기준 | 연결한 MCP 서버가 알려 주는 정보로 정해짐, 믿을 수 있는 서버만 연결 | `ai/mcp.ts:197` `readOnly: !!t.annotations?.readOnlyHint` |

## 3. 다음 국소 보강 후보 (근거만, 이번 코드 변경 없음)

- `destructiveHint` 모순: `ai/mcp.ts:197-198`은 두 표시를 따로 읽지만 무인 판정은 `readOnly`만 봄 → 둘 다 true인 도구가 무인 실행에서 실행됨. 보강안: 무인 실행에서 `destructive`면 검토로.
- `callKey` 키 순서: `agents/tools.ts:158` `JSON.stringify(input)` 그대로 → 키 순서가 바뀌면 승인 불일치로 다시 검토(안전 쪽), 쓰지 않은 승인이 같은 계보 payload로 넘어감. 보강안: 키 정렬 직렬화.

## 4. WS-03 수락 범위 확인

- 시험 202개 = 작성자 시험, Music 12개 = 독립 실행, 실제 바깥 MCP 호출은 미검수 — 그대로 구분 유지.

## 5. 브라우저

- 이 세션은 지정 브라우저 엣지를 유지한다. 이번 WS-04에서는 브라우저를 쓰지 않음.
- 다른 세션 영향 확인: WS-03 확인 때 ego lite에서 내가 만든 작업 공간(145·147)만 열고 `finish({keep:[]})`로 닫았고, 다른 세션의 작업 공간·탭은 조회·조작하지 않음 → 실제 영향 없음, 단순 지정 혼동. 반복하지 않음.

## 비용
없음(빌드 0·AI 0·DB 쓰기 0).
