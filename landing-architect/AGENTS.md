# AI 랜딩페이지 기획 자동화 (landing-architect) — 작업 지침

> 먼저 루트 `CLAUDE.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 읽는다. 이어받을 때는 [`docs/CLI_HANDOFF.md`](docs/CLI_HANDOFF.md), 설계 배경은 [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md).

## 한 줄 요약
주제·타겟·목표 → AI 기획안(JSON, 6개 섹션) → 단일 HTML 프로토타입 → 이미지 치환 → 미리보기·내보내기. 참고 원본은 Google AI Studio 앱 "AI Landing Page Architect Enhance"(개발자 GPT PARK)이며 코드는 복제하지 않고 흐름·프롬프트 구조만 참고했다.

## 구조
- `src/lib/lpa/` 순수 로직(단위 테스트 대상): `templates`(주제 20종), `prompts`(연도 주입·한국어·구조 고정), `plan`(JSON 파싱·검증·정규화·Markdown), `html`(HTML 추출·검증·이미지 키워드), `validate`(입력 정리), `types`.
- `src/lib/gemini.ts`(서버): 모델 폴백 `gemini-3.1-pro-preview → gemini-2.5-flash(gemini-2.5-pro는 신규 계정 사용 불가로 제외, 2026-10-13 확인)`(standard는 flash), 기획안은 형식 오류 시 1회 재시도. `src/lib/images.ts`(서버): Unsplash/Pexels/Pixabay 조회.
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

## 2026-10-14 v1.04 — 모바일 셸 CSS 추가 (Claude Code)

- 증상: 767px 이하에서도 좌측 메뉴가 남아 본문이 눌림. 원인: `Sidebar.tsx`의 `.mobile-sidebar`(위쪽 접는 메뉴)는 있었지만 `src/app/globals.css`에 전환 규칙이 없었음(복사한 뼈대 공통 누락).
- 수정: `globals.css` 끝에 `@media(max-width:767px)` 셸 규칙(markdown-studio·four-cut-comics와 동일) 추가. 기능 로직 변경 없음. 버전 v1.04(코드·package·DB).
- 검수: 빌드, 프로덕션 배포, 운영 화면을 폭 400px 틀(iframe)에 띄워 좌측 메뉴 숨김·위쪽 메뉴 표시·본문 385px·가로 넘침 없음 확인. 실제 휴대폰 터치는 미확인.

## v1.05 (2026-10-15) — AI 지시문에 한국 시간 현재 월 추가 (Claude Code 보조 계정)
- 연도만 주면 AI가 계절을 지어내는 문제(10월에 "봄", 루트 `docs/ERROR_LESSONS.md` 2026-10-14) 예방: src/lib/lpa/prompts.ts `yearGuard()`에 `koreaNowRule()` — "[기준 시점: 한국 시간으로 지금은 YYYY년 M월… 계절·시기 표현은 현재 월에 맞춤]"(Asia/Seoul, 서버 UTC여도 한국 날짜). 빌드 통과·프로덕션 배포 READY·DB `programs.version` v1.05. 유료 AI 실제 생성 확인은 하지 않음.


## 2026-10-16 DB 연동 변수 호환 — v1.06 (landing-architect)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
