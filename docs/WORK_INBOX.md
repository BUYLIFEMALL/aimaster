# 업무 받은편지함(공용 표 `public.work_inbox`) 사용 안내

- 만든 날: 2026-10-24 · 담당: `ai-work-workspace`([역할: workspace]) · 플랜: `ai-work-workspace/docs/PLAN_20261024_U7_WORK_INBOX.md`
- 대상: ① AIMaster 운영 공용 DB(ref `esgxyikcnnvmlhygjkth`). ② Lab(`labs/`)에는 없다.

## 1. 무엇인가
다른 AIMaster 자동화 프로그램의 결과물을 **회원 본인의 「📨 받은 업무」함**으로 보내는 공용 표입니다. 회원은 AI 업무 워크스페이스(https://ai-work-workspace.buylife.xyz/inbox)에서 그 항목을 **페이지로 만들거나 「📨 받은 업무 표」의 행으로 넣습니다.** 프로그램끼리 서로의 API를 부르지 않는다는 AIMaster 규칙을 지키면서 결과를 한곳에 모으는 방법입니다.

## 2. 표 구조
| 열 | 뜻 |
|---|---|
| `user_id` | 받는 회원(로그인 회원 본인 id만) |
| `source_slug` | 보낸 프로그램 `programs.slug` |
| `kind` | `note`(메모)·`task`(할 일)·`meeting`(회의)·`document`(문서)·`table`(표)·`link`(링크) |
| `title` | 1~200자 |
| `body_md` | 본문 마크다운(최대 20만 자) — 「페이지로 만들기」 때 그대로 블록이 됨 |
| `data` | 표 행으로 넣을 단순 값 `{ "속성 이름": 값 }`(문자·숫자·참거짓·목록, 최대 10개) |
| `source_url` | 원본 결과 화면 주소(https, 선택) |
| `imported_at`·`imported_ref` | 받는 프로그램이 가져간 때·만든 페이지(또는 할 일) id |
| `target_slug` | 받는 프로그램(기본 `ai-work-workspace`, 2026-10-25 U8-B 추가 — `ai-task-planner` 등). 받는 프로그램은 자기 slug 줄만 읽는다 |

- 보안: 회원 본인 줄만 읽기·고치기·지우기(RLS). **넣기 정책이 없어 브라우저에서는 넣을 수 없고, 각 프로그램 서버가 서버 키로만 넣습니다.**
- 30일 자동 삭제: 생성 30일 지난 줄은 워크스페이스 하루 1회 운영 정리 작업이 지웁니다. 가져가 만든 페이지·표 행은 회원 업무 자료라 남습니다.

## 3. 다른 프로그램에서 보내는 법
1. 기준 코드 `ai-work-workspace/src/lib/workInbox.ts`를 그 프로그램 `lib/workInbox.ts`로 복사합니다(공용 기준 코드 규칙 — 사본은 직접 고치지 말고 기준을 고친 뒤 맞춤).
2. 결과 화면에 **「업무 워크스페이스로 보내기」** 버튼을 달고, 서버(API 라우트·서버 액션)에서 `checkProgramAccessApi()`로 로그인 회원을 확인한 뒤:
   ```ts
   await sendToWorkInbox({ userId: user.id, sourceSlug: "ai-task-planner", kind: "task", title, bodyMd, data: { 마감일: "2026-10-30" }, sourceUrl });
   ```
3. 성공하면 「업무 워크스페이스 『받은 업무』로 보냈습니다」 안내와 https://ai-work-workspace.buylife.xyz/inbox 링크를 보여 줍니다.
4. **다른 회원 id로 보내지 않습니다.** 회원 본인 계정·키 최상위 규칙과 같습니다.

## 3-1. 연결된 프로그램
| 프로그램 | 버전 | 보내는 것 | 코드 |
|---|---|---|---|
| `ai-task-planner` | v1.11 (2026-10-25) | 할 일 하나(`task`, 표 행 데이터: 예정일·우선순위·분류·상태·예상 시간(분)·집중 시간(분)) · 하루 성과 보고(`document`) | `ai-task-planner/src/app/api/work-inbox/route.ts`, 내용 `src/lib/planner/inbox.ts` |

## 3-2. 받는 프로그램
| 받는 곳(`target_slug`) | 화면 | 코드 |
|---|---|---|
| `ai-work-workspace`(기본) | 좌측 「📨 받은 업무」 | `ai-work-workspace/src/server/workInbox.ts` |
| `ai-task-planner` | 대시보드 「📥 받은 할 일」(워크스페이스 페이지 「⋯」 → 「📨 할 일 플래너로 보내기」에서 보냄) | `ai-task-planner/src/app/api/work-inbox/received/route.ts` |
- 다른 프로그램으로 보내려면 `sendToWorkInbox({ ..., targetSlug: "<받는 slug>" })`. 받는 쪽은 서버에서 `user_id` + `target_slug` 조건을 꼭 붙인다.

## 4. 주의
- 본문에 비밀 키·다른 회원 정보를 넣지 않습니다.
- 워크스페이스 화면의 보낸 프로그램 이름 표(`ai-work-workspace/src/app/inbox/InboxBoard.tsx`의 `SOURCE`)에 새 slug를 추가하면 이름이 한국어로 보입니다(없으면 slug 그대로).
- 연계 순서(로드맵): U8 `ai-task-planner` → U9 `ai-audio-analyzer`·`ai-doc-chatbot`·`document-translator`·`ai-slide-builder` → U10 발행·분석·수집 프로그램.
