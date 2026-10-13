# UI Canvas 자동화 — 인수인계 (AGENTS.md)

> ★ 최상위 규칙: 회원은 **본인 계정·본인 Gemini API 키**로만 AI를 쓴다. 키가 없으면 폴백하지 않고 등록 안내(`needKey`)를 돌려준다. 운영자·다른 회원 키 사용 금지. ([TOP_RULE](../docs/TOP_RULE_PERSONAL_ACCOUNT_API.md))

작업 시작 전: 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`를 먼저 읽는다.

## 기본 정보

| 항목 | 값 |
|---|---|
| 이름 / slug | UI Canvas 자동화 / `ui-canvas` |
| 현재 버전 | **v1.03** (`src/lib/version.ts` = DB `programs.version`) |
| 주소 | https://ui-canvas.buylife.xyz (Vercel `buylife/ui-canvas`, 직접 `vercel deploy --prod`) |
| 카테고리 / 접근 | Tools / 최소 등급 일반, FREE 아님(일반 이상 + 관리자 부여 사용기간), 기본 3요금제 |
| 참고 원본 | AI Studio "GPT PARK의 UI 캔버스 Pro" (소스는 참고만, 코드 복제 없음) |
| 분석·계획 | [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) |

## 구조

- 스택: Next.js 16.4 + React 19.3 + TypeScript, 순수 CSS(`src/app/globals.css`), Supabase(공용), lucide-react, html2canvas(PNG), `@google/genai`(서버만).
- `src/lib/canvas/` — 순수 로직(모델·상수·히스토리 훅). **테스트 대상은 `model.ts`**: `npm test`(12개).
  - `types.ts` type 문자열은 원본 JSON과 호환(Button, Input, … Group, Misc). `constants.ts` 기본값·프리셋(흰색 캔버스용 밝은 색).
  - `model.ts` 생성·그룹/해제·복제·레이어 이동·프리셋·불러오기 검증(`parseImportedJson`)·좌표 보정(`clampToCanvas`)·AI 결과 정규화(`normalizeAiComponents`).
- `src/components/canvas/` — `Editor.tsx`(스테이지·툴바·저장·AI·단축키), `ComponentView.tsx`(25종 렌더), `Panels.tsx`(도구상자·레이어·속성·메뉴).
- API(전부 `checkProgramAccessApi()` + `dynamic="force-dynamic"`/`fetchCache="force-no-store"`):
  `/api/projects`, `/api/projects/[id]`(GET/PUT/DELETE, 소유자 필터 + `expectedUpdatedAt` 충돌 409), `/api/keys`, `/api/ai/spec`, `/api/ai/from-image`.
- DB: `ui_canvas_projects`(RLS owner-only, 서버는 service role + `user_id` 필터). SQL: `supabase/migrations/0001_register_program.sql`(테이블 + 프로그램 등록 + 요금제).
- 접근 판정은 `src/lib/access.ts` + `programAccess.ts`(루트 `lib/access/checkProgramAccess.ts` 사본, 핸드폰 필수 포함). 권한 테이블 조회는 `createAdminClient()`.

## 동작 요약

- 진입: 루트(`/`)·로그인 직후 `/open`이 가장 최근 프로젝트의 캔버스를 바로 연다(없으면 새로 만든다). 프로젝트 목록은 `/dashboard`, 에디터 왼쪽 위 [목록]에서 연다(v1.03).

- 새 프로젝트 → `/editor/[id]`. 변경 1.5초 뒤 자동 저장, 실패 시 8초마다 재시도, 다른 창에서 먼저 저장하면 충돌 표시.
- 편집: 도구 선택 후 드래그 생성, Shift/마퀴 다중 선택, 방향키 이동, 우측 속성(X/Y 직접 입력 가능), 그룹(상대좌표), 컨테이너 잠금, Ctrl+Z/Shift+Z/D/G.
- 내보내기: PNG(html2canvas, 배율 1로 맞춰 캡처), 컴포넌트 JSON(원본 형식), 명세 JSON(앱 이름·설명 필수). 불러오기는 두 형식과 원본 JSON 모두 인식.
- AI: 명세 채우기(`gemini-2.5-flash`, 구조화 JSON), 이미지→UI(클라이언트가 긴 변 1600px JPEG로 축소 후 전송, 서버는 4MB base64 제한, 결과는 적용 전 확인 창).

## 검수 기록 (2026-10-13)

- 자동: `tsc` 통과, `npm test` 12/12, `next build` 통과.
- 실제 Chrome(운영 주소, 주인님 로그인 세션): 대시보드 → 새 프로젝트 → 버튼/입력/텍스트 드래그 생성 → 범위 선택 → Ctrl+G 그룹 → 새로고침 후 유지 확인, `AI로 내용 채우기`(실제 Gemini) 성공, `/api/ai/from-image`(합성 이미지) 성공(컴포넌트 6개, 전부 캔버스 안).
- v1.02 추가 검수(운영 Chrome, 같은 날): 컴포넌트 1000개 프로젝트 — 열기 2.6초·선택 41ms, PNG 저장 1440x900 정상, 컴포넌트 JSON 1000개 정상, AI 키 없음(needKey) 응답 시 "Gemini API 키 등록이 필요합니다" 창 표시 확인(응답을 가짜로 주입해 UI만 확인), 카탈로그 썸네일 등록, 사이드바 현재 위치 중복 강조 정리. 테스트 프로젝트는 삭제함.
- 미검수(남은 일): 일반(naver) 회원 계정으로 실제 로그인 흐름(키 없는 회원 실계정), 모바일 폭 화면(브라우저 도구가 창 폭을 뷰포트에 반영하지 못해 미확인 — 실제 기기 확인 필요), 이미지 파일 업로드 UI 경유 흐름(API로 대신 검증).

## 알려진 한계 / 후속 후보

줌/팬 가이드·스냅, 다중 선택 일괄 속성, 그룹 내부 자식 개별 편집, HTML/React 코드 내보내기, 공유 링크, 다크 컴포넌트 테마, FREE 배지 전환(현재 FREE 아님 — 관리자 프로그램 편집에서 배지만 켜면 됨).

## 주의

- 도구 선택 직후 곧바로 드래그하는 자동화는 React 렌더 전에 시작되면 생성되지 않을 수 있다(사람 조작에는 문제 없음). 자동 검수 시 도구 클릭 후 1초 대기.
- `styles`에 `borderStyle: solid`만 있고 두께가 없으면 브라우저가 3px 검은 테두리를 그린다 → `ComponentView.hasBorder`로 방지.
- 원본의 운영자 키 클라이언트 번들 주입 패턴은 절대 복제하지 않는다.
