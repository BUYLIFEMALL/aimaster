# AI 블로그 키워드 자동화 (blog-keyword) — 작업 지침

> 먼저 루트 `CLAUDE.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 읽는다. 이어받을 때는 [`docs/CLI_HANDOFF.md`](docs/CLI_HANDOFF.md), 설계 배경은 [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md).

## 적용 디자인 템플릿
**스마트 매트릭스 스타일**(v1.05) — [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) · 플랜 [docs/PLAN_20261016_DESIGN_RENEWAL.md](docs/PLAN_20261016_DESIGN_RENEWAL.md) · 개선 원장 [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · 인수인계 [docs/IMPROVEMENT_HANDOFF_20261016.md](docs/IMPROVEMENT_HANDOFF_20261016.md)

## 한 줄 요약
키워드 하나로 자동완성·AI 연관검색어·상위 블로그·경쟁력·오늘의 전략 키워드·다각도 주제·뉴스·카테고리 트렌드를 한 화면에서 이어서 분석하고, 제목·썸네일 문구·공략법을 제안한다. 참고 원본은 AI Studio의 "키워드 파이터 for Gemini"(원본·네이버 API 버전, 개발자 AIFACT GPT-PARK) 두 앱이며 코드는 복제하지 않고 기능 구조만 참고해 새로 작성했다.

## 구조
- `src/lib/kw/` 순수 로직(단위 테스트 대상): `types`(기능·결과 타입), `util`(연도 주입·정규화·JSON 추출·빈출어·추이), `prompts`(기능별 프롬프트·스키마), `library`(프롬프트 50개), `links`(트렌드 도구·분야), `export`(Markdown/CSV).
- 서버 전용: `kw/naver.ts`(검색·뉴스·데이터랩·검색광고·자동완성; API HUB 먼저, 401/403/404면 구방식 폴백), `kw/features.ts`(기능별 실행), `gemini.ts`(모델 폴백 `gemini-3.5-flash → 2.5-flash`, 구글 검색 그라운딩, JSON 재시도), `reports.ts`(기록 저장·100건 정리), `apiKeys.ts`, `aiRoute.ts`(`guardRoute`).
- API(모두 `checkProgramAccessApi` + `force-dynamic`): `POST /api/analyze`(기능 실행+저장, 자동완성의 "주제 만들기"는 `params.action="topics"`), `GET/PATCH/DELETE /api/history`, `GET/POST/DELETE /api/keys`, `POST /api/keys/test`.
- 화면: `/dashboard`(작업대 `components/kw/Workbench.tsx`, `?report=<id>`로 기록 열기), `/history`, `/settings`(키 3묶음), `/guide`.
- DB: `blog_keyword_reports`(RLS owner-only, 서버는 service role + `user_id` 필터). 키는 공용 `user_api_keys`의 기존 provider(`gemini`, `naver_client_id/secret`, `naver_ads_api_key/secret_key/customer_id`)를 그대로 쓴다 — 제약 변경 없음.

## 지킬 것
- 키는 회원 본인 것만. Gemini 없으면 `needKey`, 네이버 없으면 `needNaver` 안내, 폴백 금지. 자동완성 목록만 Gemini 없이 허용.
- 모든 프롬프트에 `yearGuard()`로 당해 연도·오늘 날짜 주입(핵심 원칙 8번). 새 프롬프트도 `prompts.ts`에 같은 방식으로 추가.
- "AI 추정"(점수)과 "실측"(검색광고 월간 검색수·블로그 문서 수·데이터랩 추이)을 화면에서 구분해 표기한다. 추정 점수를 실측처럼 쓰지 않는다.
- 외부 주소는 `naver.ts`의 고정 주소만. 임의 URL을 받는 프록시를 만들지 않는다(원본 앱의 열린 프록시는 복제하지 않았다).
- 그라운딩 호출은 JSON 모드(`responseSchema`)를 쓸 수 없어 텍스트에서 JSON을 꺼낸다 → 항상 `util.str/num/objArr`로 정규화.
- 버전은 `src/lib/version.ts`와 DB `programs.version`을 함께 올린다. Supabase MCP `execute_sql`은 문장별로 보낸다.

## 검수
- `npm test`(순수 로직 13건), `npm run test:browser`(보이는 Chrome, 모의 API 14건), `npm run build`.
- 실제 호출: `NODE_OPTIONS=--conditions=react-server node --import tsx test-artifacts/real-call.mts [기능…]`(운영자 본인 계정에 등록된 Gemini·네이버·검색광고 키 사용). 출력은 파일로 리다이렉트한다. 네이버 키가 있는 계정이면 blogs·news·trend·실측 지표(검색광고·데이터랩)도 함께 실호출된다(`trend-check.mts`로 빈출어·추이만 확인).

## 2026-10-14 v1.03 — 모바일 셸 CSS 추가 (Claude Code)

- 증상: 767px 이하에서도 좌측 메뉴가 남아 본문이 눌림. 원인: `Sidebar.tsx`의 `.mobile-sidebar`(위쪽 접는 메뉴)는 있었지만 `src/app/globals.css`에 전환 규칙이 없었음(복사한 뼈대 공통 누락).
- 수정: `globals.css` 끝에 `@media(max-width:767px)` 셸 규칙(markdown-studio·four-cut-comics와 동일) 추가. 기능 로직 변경 없음. 버전 v1.03(코드·package·DB).
- 검수: 빌드, 프로덕션 배포, 운영 화면을 폭 400px 틀(iframe)에 띄워 좌측 메뉴 숨김·위쪽 메뉴 표시·본문 385px·가로 넘침 없음 확인. 실제 휴대폰 터치는 미확인.


## 2026-10-16 DB 연동 변수 호환 — v1.04 (blog-keyword)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.


## 2026-10-16 v1.05 — 스마트 매트릭스 디자인 리뉴얼 (Claude Code 맥미니)

- 일반 CSS에 `--mx-*` 토큰(롱테일과 같은 다크 차콜 + 블루·앰버)을 넣고 기존 `--brand/--line/--muted`를 연결, `globals.css`·`kw.css`의 밝은 색 전부 교체(클래스 이름 유지 — 브라우저 테스트 선택자 보존).
- 대시보드 히어로 + 지표 4종(`DashboardStats`), 기록 검색·분석 종류 칩, 기록·설정·매뉴얼 히어로, 매뉴얼 캐릭터 말풍선 + 4단계 흐름. 서버·API·DB 변경 없음. 버전 v1.05(package 1.0.5).
- **테스트·빌드·배포·화면 검수는 윈도우 CLI 대기** — [docs/IMPROVEMENT_HANDOFF_20261016.md](docs/IMPROVEMENT_HANDOFF_20261016.md).
