# AI 종합 성격 진단 자동화 (personality-suite) — 작업 지침 (v1.04)

> 먼저 루트 `CLAUDE.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 읽는다. 이어받을 때는 [`docs/CLI_HANDOFF.md`](docs/CLI_HANDOFF.md), 설계 배경은 [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md).

## 한 줄 요약
상황별 16유형 검사 10종 + 성격 5요인·행동 스타일·애착·에니어그램·기질·성향 5종 + 마음 상태 자기점검 1종(총 16종)을 한 문항씩 풀고, 점수·기본 해석을 바로 보며, 회원 본인 Gemini 키로 **AI 심층 분석**과 **종합 프로필**을 받는다. 참고 원본은 AI Studio "다기능 종합 성격 진단기 (배포용)"이며 코드·문항·해석문은 복제하지 않고 기능 구조만 참고했다. 모든 문항·해석은 새로 작성했다.

## 구조
- `src/lib/tests/` **순수 로직(단위 테스트 대상)**: `types`(5단계 척도, 검사·결과 타입), `scoring`(`validateAnswers`·`scoreTest`: 서버가 점수를 다시 계산), `content/*`(문항·유형 해석), `registry`(`ALL_TESTS`·`GROUPS`), `report`(`buildReport`·`describeForAi`), `ai`(프롬프트·스키마·응답 정규화·`yearGuard`).
- v1.02 추가: `content/careTests.ts`(기질·성향 24문항·마음 상태 20문항·해석·`CRISIS_NOTICE`), `registry.isSensitive()`, `report.compareResults()`(같은 검사 이전 결과 비교), `results.getPreviousResult()`·`latestPerTest()`(직전 결과 포함).
- v1.03 추가: `lib/tests/trends.ts`(`buildTrends` 순수 함수: 2회 이상 한 점수형 검사만 시간순·최대 12점, 민감 검사 제외), `components/tests/TrendChart.tsx`(SVG 꺾은선, 프로필 화면 하단), `lib/shareImage.ts`(결과 카드를 브라우저 canvas로 PNG 생성 — 서버 전송 없음, 마음 상태 점검은 제외), 결과 화면 [인쇄·PDF 저장](`window.print` + `@media print`).
- v1.04 추가: 종합 프로필 **검사별 반영 비중**(`ai.ts` `Weight` 0~3·`WEIGHT_LABELS`·`normalizeWeights`). 회원이 프로필 화면에서 검사별 제외/참고/중요/핵심을 고르면 `POST /api/profile`의 `weights`로 보내고, 서버가 검증해 제외 검사를 빼고 비중순으로 정렬해 프롬프트에 `중요도:` 줄로 전달한다. `basedOn`에 `weight`를 함께 저장(스키마 변경 없음). 선택값은 이 브라우저 localStorage에만 기억한다.
- 서버 전용: `gemini.ts`(모델 폴백 `gemini-3.5-flash → 2.5-flash`, JSON 재시도, MAX_TOKENS 감지), `results.ts`(결과·프로필 CRUD, 항상 `user_id` 필터, 회원당 결과 100개 정리), `apiKeys.ts`, `aiRoute.ts`(`guardAi`).
- API(모두 `checkProgramAccessApi` + `force-dynamic`): `POST /api/submit`(키 불필요), `GET /api/results`, `GET/DELETE /api/results/[id]`, `POST /api/analyze`(본인 키), `GET/POST /api/profile`(본인 키), `/api/keys`(+`/test`).
- 화면: `/dashboard`(검사 목록) → `/test/[id]`(`TestRunner`) → `/result/[id]`(`ResultView`), `/history`, `/profile`, `/settings`, `/guide`.
- DB: `personality_suite_results`, `personality_suite_profiles`(RLS owner-only `for all`, 서버는 service role + `user_id` 필터). 키는 공용 `user_api_keys`의 기존 provider `gemini`만 쓴다 — 제약 변경 없음.

## 지킬 것
- **마음 상태 자기점검(`wellbeing`)은 민감 정보다**: 제출 시 `save:true`를 명시하지 않으면 서버가 저장하지 않고 결과만 돌려준다(`/api/submit`의 `saved:false`). 저장해도 AI 분석(`/api/analyze` 400)·종합 프로필에서 제외한다. 결과 화면에는 점수와 무관하게 고정 안내(109·1577-0199·1388·119)를 항상 보여 준다. 진단 용어(우울증·불안장애 등)·자해 문항은 쓰지 않는다(단위 테스트가 검사).
- 키는 회원 본인 Gemini 키만. 없으면 `needKey` 안내, 폴백 금지. **검사 제출·기본 해석에는 AI를 쓰지 않는다**(키 없이도 동작).
- 모든 프롬프트에 `yearGuard()`로 당해 연도·오늘 날짜 주입(핵심 원칙 8번), 진단·병명·단정 금지, 결과 텍스트는 "데이터"로 취급(프롬프트 인젝션 방지 문구 유지).
- **상표·공식 검사 이름을 제목·소개에 쓰지 않는다**(MBTI→"16유형", DISC→"행동 스타일", TCI·MMPI 언급 금지). 단위 테스트가 검사한다. 모든 결과 화면에 "참고용·진단 아님" 안내 유지.
- 사고(thinking) 토큰은 `maxOutputTokens`에 포함된다: AI 분석 JSON은 8192 이상. 끊기면(`truncated`) 오류로 알린다.
- 버전은 `src/lib/version.ts`·`package.json`·DB `programs.version`을 함께 올린다. Supabase MCP `execute_sql`은 문장별로 보낸다.
- 화면은 흰색 베이스 + 표준 사이드바(계정은 마지막 메뉴 바로 아래).

## 검수
- `npm test`(순수 로직 19건: 문항 균형·16유형 전 도달·역문항·동점·AI 정규화), `npx tsc --noEmit`, `npm run build`.
- 운영 확인(2026-10-14): 로그인 상태에서 성격 5요인 30문항 → 결과 → AI 심층 분석 → 삭제까지 확인(테스트 결과 삭제).

## 남은 일 (v1.03 후보)
- 일반 회원 계정 흐름 재확인(주인님 로그인 후). 그 외 확정된 후속 과제 없음.
- v1.02 운영 확인(2026-10-14): 마음 상태 점검 미저장→저장→AI 차단·삭제, 기질 검사 2회 비교 문구, 프로필 `changes` 생성 확인(테스트 결과·프로필 삭제).

## 2026-10-14 v1.05 — 모바일 셸 CSS 추가 (Claude Code)

- 증상: 767px 이하에서도 좌측 메뉴가 남아 본문이 눌림. 원인: `Sidebar.tsx`의 `.mobile-sidebar`(위쪽 접는 메뉴)는 있었지만 `src/app/globals.css`에 전환 규칙이 없었음(복사한 뼈대 공통 누락).
- 수정: `globals.css` 끝에 `@media(max-width:767px)` 셸 규칙(markdown-studio·four-cut-comics와 동일) 추가. 기능 로직 변경 없음. 버전 v1.05(코드·package·DB).
- 검수: 빌드, 프로덕션 배포, 운영 화면을 폭 400px 틀(iframe)에 띄워 좌측 메뉴 숨김·위쪽 메뉴 표시·본문 385px·가로 넘침 없음 확인. 실제 휴대폰 터치는 미확인.
