# AI 종합 성격 진단 자동화 (personality-suite) — 작업 지침 (v1.22)

## 2026-10-20 v1.22 — 좌측 메뉴를 AI 이미지 스튜디오 배치로 (Claude Code 윈도우, 주인님 스크린샷 지시)
- 매뉴얼: 제목+설명(「4단계 진단 & 활용 팁」)+「가이드」 배지가 있는 금색 카드(`guide-card`). 그 아래 구분선 → 🔑 API키등록·플랫폼연동(`utility-links`).
- 계정 이메일·로그아웃: 데스크톱 사이드바 **맨 아래**(`.desktop-sidebar .sidebar-account{margin-top:auto}`). 주인님이 AI 이미지 스튜디오 화면을 보여 주며 직접 지시한 배치라 `docs/SIDEBAR_LAYOUT_STANDARD.md`의 「마지막 메뉴 바로 아래」 기본값보다 우선함. 모바일 접는 메뉴는 그대로.
- 바뀐 파일: `src/components/layout/Sidebar.tsx`, `src/app/globals.css`, `src/lib/version.ts`·`package.json`(v1.22). DB `programs.version` v1.22.

## 2026-10-20 v1.21 — 타로점 「미스틱 미드나잇 퍼플」 스타일로 디자인 변경 + 깨진 화면 복구 (Claude Code 윈도우)
- **주인님 지시**: AIMaster 타로점(`tarot-reading`) 디자인 템플릿으로 변경. 색 토큰을 타로점 `tarot/app/globals.css`와 같게 맞춤(배경 `#090614`, 카드 `#120d24`, 테두리 `#2a1f4e`, 보라 `#a855f7`/`#c084fc`, 금색 `#f59e0b`, 시안 `#38bdf8`).
- **발견·수정한 버그**: 이 프로그램에는 Tailwind가 설치돼 있지 않은데 v1.20의 대시보드·매뉴얼이 Tailwind 클래스로 작성돼 배치가 전부 무시됨(숫자 카드·4단계가 세로로 풀리고, 자주 묻는 질문은 브라우저 기본 화살표 ▸와 직접 넣은 ▼가 질문 글 위아래로 따로 찍혀 겹쳐 보임 — 주인님 신고). 두 화면을 `globals.css`의 `ps-*` 일반 CSS 클래스로 다시 작성(새 패키지 설치 없음). 자주 묻는 질문은 기본 화살표를 숨기고 질문 오른쪽 끝 동그란 금색 화살표 하나만 두어, 펼치면 위로 돌아가게 함.
- **바뀐 파일**: `src/app/globals.css`(전체 색 토큰화·다크 테마, 인쇄 시 밝은 색 복귀), `src/app/(workspace)/dashboard/page.tsx`, `src/app/(workspace)/guide/page.tsx`, `src/components/layout/Sidebar.tsx`(직접 지정 색 제거 → `nav-guide`·`ps-version`·`ps-mobile-guide`), `src/components/tests/TrendChart.tsx`(어두운 배경용 선 색), `src/lib/version.ts`·`package.json`(v1.21).
- **그대로 둔 것**: 결과 공유 PNG(`src/lib/shareImage.ts`)는 SNS 공유용 밝은 카드 그대로. 기능·DB·API 변경 없음.
- **주의**: 새 화면을 만들 때 Tailwind 클래스를 쓰지 말 것(미설치) — `globals.css`의 토큰(`var(--surface)` 등)과 `ps-*` 클래스를 사용.


> 먼저 루트 `CLAUDE.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 읽는다. 이어받을 때는 [`docs/IMPROVEMENT_HANDOFF_20261019.md`](docs/IMPROVEMENT_HANDOFF_20261019.md), 디자인 인수인계는 [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md).

## 2026-10-19 v1.20 — 크리에이티브 아틀리에 파스텔 에디션 리뉴얼 & 가이드북 고도화 (Antigravity)
- **디자인 테마**: 크리에이티브 아틀리에 스타일 — 파스텔 퍼스널리티 종합 진단 에디션 (`#fefcf9`, 코랄 로즈 `#f43f5e`, 라벤더 `#8b5cf6`, 파스텔 에메랄드 `#10b981`).
- **가이드북 고도화**: `/guide` (`📖 연동 & 사용 매뉴얼`)에 4단계 프로세스 다이어그램, 지원 검사군 매트릭스 도감 표, 7대 황금 수칙, FAQ 5종 아코디언 구축.
- **대시보드 메인**: 프리미엄 아틀리에 히어로 배너, 3대 핵심 KPI 카드(지원 검사 종수, 나의 완료 검사 이력, AI 융합 프로필), 4단계 파이프라인 가이드 바 탑재.
- **사이드바 & 모바일**: `v1.20` 배지, 가이드북 하이라이트 메뉴, 56px 모바일 반응형 헤더 완비.
- **버전 3중 동기화**: `package.json`(`1.20.0`), `src/lib/version.ts`(`v1.20`), Supabase DB `programs`(`v1.20`).
- **검수**: Next.js 16.4.0 (Turbopack) 로컬 빌드 성공(3.3초), Vercel 프로덕션 배포(`https://personality-suite.buylife.xyz`), Edge 포그라운드 7종 캡처 수집 및 10분 화면 유지 세션 완료.

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


## 2026-10-16 DB 연동 변수 호환 — v1.06 (personality-suite)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-19 브라우저 자동 테스트 추가 (Claude Code 윈도우, 앱 코드 무변경 — 버전·배포 없음)
- **발견**: `package.json`에 `test:browser` 명령·`playwright`는 있었지만 테스트 파일이 없었다(뼈대 복사 흔적).
- **추가**: `tests/browser.mjs` + `tests/browser-entry.tsx` + `tests/stub-navigation.ts`(시험 서버에는 Next 앱 라우터가 없어 `next/navigation`의 `useRouter`를 대체 — 이동 요청을 `window.__pushed`에 기록). `/api/submit`·`/api/analyze`는 모의 응답이라 실제 저장·AI 호출 없음. 민감 검사 결과는 실제 `scoreTest`로 계산해 돌려준다.
- **검사 6개**: 검사 진행(답하면 다음·←로 이전·답 유지·답 전 [다음] 잠김) / 제출(답 개수·값 전송 → `/result/<id>` 이동) / 마음 상태 점검(위기 안내 표시·저장 없이 결과만·결과 이미지 버튼 없음·[내 기록에 저장] 때 `save=true`) / 결과 화면(점수 보고서·AI 심층 분석 모의 표시·결과 이미지 PNG 내려받기) / 390px 가로 넘침 없음 / 화면 스크립트 오류 없음.
- **실행**: `npm run test:browser` (보이는 Chrome 창이 잠깐 열림, 외부 파일 불필요). 실패하면 `test-artifacts/browser-fail.png`.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->
