# AI 랜딩페이지 기획 자동화 (landing-architect) — 작업 지침

> 먼저 루트 `CLAUDE.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 읽는다. 이어받을 때는 [`docs/CLI_HANDOFF.md`](docs/CLI_HANDOFF.md), 설계 배경은 [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md).

## 한 줄 요약
주제·타겟·목표 → AI 기획안(JSON, 6개 섹션) → 단일 HTML 프로토타입 → 이미지 치환 → 미리보기·내보내기. 참고 원본은 Google AI Studio 앱 "AI Landing Page Architect Enhance"(개발자 GPT PARK)이며 코드는 복제하지 않고 흐름·프롬프트 구조만 참고했다.

## 구조
- `src/lib/lpa/` 순수 로직(단위 테스트 대상): `templates`(주제 20종), `prompts`(연도 주입·한국어·구조 고정), `plan`(JSON 파싱·검증·정규화·Markdown), `html`(HTML 추출·검증·이미지 키워드), `validate`(입력 정리), `types`.
- `src/lib/gemini.ts`(서버): 모델 폴백 `gemini-3.1-pro-preview → gemini-2.5-pro → gemini-2.5-flash`(standard는 flash), 기획안은 형식 오류 시 1회 재시도. `src/lib/images.ts`(서버): Unsplash/Pexels/Pixabay 조회.
- API(모두 `checkProgramAccessApi` + `force-dynamic`): `/api/ai/suggest|plan|code`, `/api/images/resolve`, `/api/keys`, `/api/projects(/[id])`.
- 화면: `/open`(최근 프로젝트 열기) → `/project/[id]`(`components/studio/Workspace.tsx`), `/dashboard`, `/settings`(API키등록·플랫폼연동), `/guide`.

## 지킬 것
- 키는 회원 본인 것만(`user_api_keys`: gemini, unsplash, pexels, pixabay). 없으면 needKey 안내, 폴백 금지. 이미지 제공자 키도 서버에서만 호출한다.
- 프로토타입 생성은 **무상태**: 기획안을 요청에 담아 보낸다(서버 세션 없음).
- 프롬프트에는 당해 연도 주입(`yearGuard`)과 한국인 기본 묘사를 유지한다.
- 미리보기 iframe은 `sandbox="allow-scripts"`만(팝업·모달·same-origin 금지).
- 버전은 `src/lib/version.ts`와 DB `programs.version`을 함께 올린다.

## 검수
- `npm test`(순수 로직 11건), `npm run test:browser`(보이는 Chrome, 모의 API 14건), `npm run build`.
- 실제 호출 확인: `NODE_OPTIONS=--conditions=react-server node --import tsx`로 `src/lib/gemini.ts`의 `makePlan`/`makeHtml`을 본인 키로 1회 실행(2026-10-13: 기획안 20초, HTML 71초, standard 모델).
