# YOUTUBE VIRAL FINDER — AI 에이전트 인수인계 문서 (AGENTS.md)

> # ★★★ 최상위 절대 불변 규칙 (2026-10-09 주인님 지시)
> **모든 사용자는 본인의 계정과, 본인이 사용할 본인 YouTube API 키 및 AI 키(Gemini/OpenAI)를 각각 직접 등록·연동해서 사용한다.**
> 운영자(주인님)나 타인의 키로 대신 처리하지 않으며, 키가 없으면 "본인 키를 등록해주세요"로 안내한다.

---

## 1. 개요 & 버전 현황
- 프로그램명: **YOUTUBE VIRAL FINDER**
- Slug: `youtube-viral-studio`
- 현재 버전: `v1.24` (2026-10-22 영상 요약 대사 기호 정리·넘기는 대사에 프로그램 이름, 아래 v1.24 절. v1.15~v1.23은 각 날짜 절) (`src/lib/version.ts`, `package.json`, DB `programs.version`)
- 공식 라이브 URL: [https://youtube-viral-studio.buylife.xyz](https://youtube-viral-studio.buylife.xyz)
- Vercel URL: [https://youtube-viral-studio.vercel.app](https://youtube-viral-studio.vercel.app)
- 기반 환경: Next.js 16.4.2 + React 19 + Tailwind CSS v4 + Supabase SSR
- 공유 Supabase DB: `esgxyikcnnvmlhygjkth`

---

## 2. SSO 로그인 및 세션 관리 (v1.03)
- **도메인 SSO 연동**: 커스텀 도메인 `youtube-viral-studio.buylife.xyz`를 Vercel 프로젝트에 연동하고, `.buylife.xyz` 와일드카드 세션 쿠키를 공유.
- **자체 로그인 화면 구현 (`src/app/(auth)/login/page.tsx`)**:
  - 서브프로그램 내부에서 직접 이메일/비밀번호 로그인 지원 (`signInAction()`).
  - 로그인 성공 시 본래 요청 경로(`redirect` 쿼리 파라미터)로 즉시 딥링크 복귀.
  - 메인 사이트 로그인 연동 지원: 메인 사이트 `LoginForm.tsx`가 `redirectTo` 절대 URL 이동을 지원하여 상호 복귀 보장.
- **Next.js 프록시 미들웨어 (`src/proxy.ts`)**:
  - `cookieDomainForHost`를 통해 `.buylife.xyz` 도메인으로 세션 쿠키 동기화.
  - 비인가 사용자는 `/login?redirect=...`로 딥링크를 보존하며 리다이렉트.

---

## 3. 핵심 구현 모듈

### 백엔드 로직 (`src/lib/youtube/`)
- `client.ts`: Google YouTube Data API v3 호출 래퍼 (할당량 소진, 잘못된 키 에러 정밀 핸들링)
- `metrics.ts`:
  - `calculateVPH()`: 시간당 조회수 속도 계산 (Views Per Hour)
  - `calculateVsRatio()`: 구독자 대비 조회수 배수 계산 (소형 채널 파괴력)
  - `calculateViralScore()`: 0~100점 바이럴 점수 및 등급 뱃지(초대박/대박/떡상/양호) 산출
- `viralShorts.ts`: 다차원 필터링 기반 떡상 쇼츠 검색
- `goldenChannels.ts`: 구독자 1만명 이하 고효율 황금 채널 스크리닝
- `trendingVideos.ts`: 대한민국 실시간 급상승 영상 수집 및 VPH 랭킹 산출
- `sourceFinder.ts`: 쇼츠 설명란 링크 파싱 + 동일 채널 롱폼 영상의 단어 유사도 기반 원본 역추적
- `transcript.ts`: YouTube 자막(Subtitles) 실시간 파싱 엔진
- `scriptAnalyzer.ts`: Gemini 2.0 Flash / GPT-4o-mini 기반 쇼츠 3단 구조(첫 3초 훅킹, 시청 지속력, 행동유도 CTA) 해체 및 카피캣 템플릿 생성

### 권한 및 설정 (`src/lib/`)
- `auth.ts`: `requireUser()` 세션 검증
- `access.ts`: `requireProgramAccess()` (FREE 배지 및 관리자 프리패스, 구독/기간 권한 검증 시 RLS 차단 방지를 위해 `createAdminClient()` 사용)
- `apiKeys.ts`: 회원별 본인 API 키(`youtube_api_key`, `gemini`, `openai`) 조회 및 마스킹

---

## 4. UI 화면 구성 (`src/app/(dashboard)/`)
- 유튜브 다크 표준 레이아웃(v1.13, #0f0f0f) (`docs/SIDEBAR_LAYOUT_STANDARD.md` 준수)
- `/dashboard`: 첫 화면(외부 YouTube API 없음)
- `/viral-shorts`: 조회수 폭발 쇼츠 찾기 + **[✨ AI 떡상 대본 분석] 원클릭 모달 연동**
- `/golden-channels`: 황금 채널 발굴기
- `/trending-videos`: 실시간 터진 영상 (VPH 뱃지, 쇼츠/롱폼 탭)
- `/source-finder`: 쇼츠 원본 찾기
- `/favorites`: 즐겨찾기 보관함 (CSV 내보내기 지원)
- `/settings`: YouTube Data API v3 키 + Gemini / OpenAI API 키 설정
- `/guide`: 핵심 지표 해석 및 이용 가이드

---

## 5. v1.09 (2026-10-11) — 권한 확인 보강·Claude 키 이름 수정
- `/api/youtube/*` 5개와 `/api/settings/api-keys`(GET/POST/DELETE)가 로그인뿐 아니라 **프로그램 이용 권한**도 확인한다(`src/lib/access.ts`의 `checkProgramAccessApi()`). 판정 규칙은 루트 `lib/access/checkProgramAccess.ts`의 사본 `src/lib/programAccess.ts`를 쓴다(규칙이 바뀌면 사본도 같이 고칠 것). 각 route에 `dynamic = "force-dynamic"` + `fetchCache = "force-no-store"`를 선언했다.
- `requireProgramAccess()`도 같은 표준 판정으로 교체했다(정지 → 관리자 → FREE → 구독 → 등급 미지정 허용 → 등급 ≥ 최소 등급 + 사용기간). 현재 DB는 `required_grade_id`가 비어 있어 로그인 회원은 그대로 통과한다.
- `apiKeys.ts`의 Claude provider 이름을 `claude` → `anthropic`으로 바꿨다(DB `user_api_keys` 체크 제약 기준).
- v1.10 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.

## v1.11 (2026-10-15) — AI 지시문에 한국 시간 현재 월 추가 (Claude Code 보조 계정)
- 연도만 주면 AI가 계절을 지어내는 문제(10월에 "봄", 루트 `docs/ERROR_LESSONS.md` 2026-10-14) 예방: src/lib/ai/scriptAnalyzer.ts `SYSTEM_PROMPT`에 `koreaNowRule()` — "[기준 시점: 한국 시간으로 지금은 YYYY년 M월… 계절·시기 표현은 현재 월에 맞춤]"(Asia/Seoul, 서버 UTC여도 한국 날짜). 빌드 통과·프로덕션 배포 READY·DB `programs.version` v1.11. 유료 AI 실제 생성 확인은 하지 않음.


## 2026-10-16 DB 연동 변수 호환 — v1.12 (youtube-viral-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-17 v1.13 — 디자인 리뉴얼: 유튜브 다크 콘솔 — 스튜디오 변형 (Claude Code 맥미니)
- `youtube-auto-reply`와 같은 `yt-*` 토큰(Tailwind v4 `@theme`), 사이드바 빨간 막대·**휴대폰 ☰(원래 휴대폰 메뉴 없음)**, `/dashboard` 신설(`/`→`/dashboard`, 유튜브 API 호출 없음), 매뉴얼에 숫자 읽는 법·등급 기준표, 로그인 다크, `(dashboard)/layout.tsx` fetchCache 추가. 디자인: [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md)
- **빌드·배포·화면 검수는 윈도우 CLI 대기.**
- 플랜: [docs/PLAN_20261017_DESIGN_RENEWAL.md](docs/PLAN_20261017_DESIGN_RENEWAL.md) · 개선 원장: [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · 인수인계: [docs/IMPROVEMENT_HANDOFF_20261017.md](docs/IMPROVEMENT_HANDOFF_20261017.md)

## 2026-10-17 Codex(Windows) — v1.13 최종 인수

유튜브 다크·신규 대시보드·375px 메뉴 운영 검수 완료. Next16.4.2 보안 보완, APP/DB v1.13·package1.13.0. 소스 b50bfaff929137c33538c3b8bb0a09c47aca48f8 푸시, 프로덕션 dpl_4r4FxwdNB38SzofnmBQFYakRmdMt READY. 실제 일반 회원 Edge1440/375 8화면·메뉴, 합성 카드7검사, 비로그인 API8개401. 자동 검색 요청은 브라우저 모의 응답으로만 처리(실제 검색/AI0). 운영 의존성 보안 경고0, 개발high5·lint 설정 부재 남음. **즐겨찾기 회원분리·30일 자동삭제는 미해결**이며 디자인 완료와 구분. [최종 인수인계](docs/WINDOWS_HANDOFF_20261017.md), [개선 원장](docs/IMPROVEMENTS.md). https://youtube-viral-studio.buylife.xyz

## v1.14 (2026-10-17) — 즐겨찾기·회원 격리·30일 보관 개선

저장/해제 콜백 복구, 본인 전용 DB/RLS·30일 경계/자동 정리(Cron 실제 실행 확인), 자동검색 제거, 가이드/누락 지수/CSV 보완. DB 변경은 주인님 별도 승인 후 적용했습니다. [새 인수인계](docs/IMPROVEMENT_HANDOFF_20261017_V114.md). 운영 배포 결과는 이 문서의 최신 기록을 따릅니다.

### v1.14 운영 완료

소스 68b2b0109cd5533441d5f7cfaf84b894a19fcab6 푸시, dpl_6E59ACNhP719UAtzc2UA8Tktw8Rx READY, DBv1.14. 실제 일반 회원 Edge1440/375·보관10검사·API11개401·로그오류0. 자동검색0·실제 YouTube/AI 호출0. 회원별 저장/RLS·30일 만료/정리 적용 및 실제 Cron 실행 확인. [최종 인수인계](docs/IMPROVEMENT_HANDOFF_20261017_V114.md).

## v1.14 최신 프로그램 설명·후속 작업 (공통 7항목)

1. **목적·대상:** 본인 YouTube 키로 쇼츠/영상/채널 후보를 조사하고 참고 자료를 보관하는 콘텐츠 제작자용 도구입니다. 지표는 후보 비교용이며 성공·추천 알고리즘 유입을 확정하지 않습니다.
2. **도구·기법·스킬:** Next16.4.2·React19·TypeScript·Tailwind4, Supabase SSR/Postgres RLS·pg_cron, YouTube Data API, 회원 본인 AI 키 대본 분석. 이번 작업은 Node 검사·ESLint9·Playwright 실제 Edge·Supabase MCP·Vercel CLI와 Supabase/Postgres·React/배포 지침을 사용했습니다. 외부 검색/AI 실호출 없이 합성 응답과 실제 본인 DB를 구분해 검수했습니다.
3. **기능·로직·장단점:** 검색 버튼→본인 키 API→영상/채널 카드→본인 즐겨찾기 API/RLS→전용 yvs_favorites 저장. 30일 경계부터 조회 차단, 분당 Cron 물리 정리. 자동검색 없이 회원이 호출하고 재저장해도 생성일을 연장하지 않는 장점이 있습니다. 지표 추정, 본인 Cloud 한도, 최근1000건 조회, 기존 개발 도구 경고가 한계입니다. 과거 소유자 불명 localStorage는 자동 이전하지 않습니다.
4. **현재 버전·히스토리:** v1.13 다크/모바일/대시보드 운영 완료 → v1.14 회원 DB·30일 보관·선택 검색·안내/CSV·메모 복사 운영 완료. 과거 버전 항목의 미완료 표시는 당시 기록이며 최신 [결과 문서](docs/IMPROVEMENT_HANDOFF_20261017_V114.md)를 따릅니다.
5. **대기 과제:** [개선 대기 목록](docs/IMPROVEMENT_BACKLOG.md) 및 [원장](docs/IMPROVEMENTS.md). 개발 의존성 high5·lint경고74, 즐겨찾기1000건 페이지 나눔, 회원별 검색 임시 저장은 미완료입니다. 새로운 DB 범위는 별도 승인 확인이 필요합니다.
6. **연계·아이디어:** Playlist에 본인 영상 제목/URL 참고 메모를 명시적으로 복사/붙여넣는 연결을 제공합니다. 채널 진단/쇼츠 대본/SEO 프로그램 연계는 제안입니다. 다른 회원 결과·키를 공유하지 않습니다.
7. **UI·스타일 제안:** 유튜브 다크와 모바일 메뉴를 유지합니다. 후속은 즐겨찾기 대량 탐색/페이지 나눔과 키보드 조작성입니다. 과거 예시칩/정렬 제안은 기존 구현과 대조한 뒤 중복 개발하지 않습니다.

## 2026-10-17 개발 도구 보안 경고 high 5 — 조사 완료·수용 (Claude Code 윈도우, 코드 변경 없음)
- 5건 모두 한 경로: `eslint-config-next@16.4.2 → @next/eslint-plugin-next@16.4.2 → fast-glob@3.3.1 → micromatch@4.0.8 → braces@3.0.3`(깊게 중첩된 패턴으로 인한 서비스 거부).
- 고칠 수 없음: `braces` 최신이 3.0.3(2024-09 이후 새 버전 없음), `@next/eslint-plugin-next` 최신 16.4.2·16.5.0-canary.16도 같은 `fast-glob@3.3.1`. npm 제안(eslint-config-next 14.2.35로 내리기)은 Next 16과 맞지 않아 제외. 검사 도구를 빼면 Next 전용 규칙을 잃어 제외.
- 영향 없음: 개발 PC의 `npm run lint`에서만 실행, Next 16 `next build`는 lint를 돌리지 않음, 패턴은 설정 파일 고정이라 외부 입력이 닿지 않음. 운영 의존성 `npm audit --omit=dev` 0건.
- 다음: Next 검사 플러그인이 `fast-glob`을 바꾸거나 `braces` 수정판이 나오면 `npm audit`로 재확인 후 갱신. 증거 `docs/evidence/dependency-audit-dev-20261017.json`·`dependency-audit-prod-20261017.json`.

## 2026-10-17 v1.15 — 코드 규칙 경고 74건 → 0건 (Claude Code 윈도우, 동작 동일)
- **쓰지 않는 import·변수 28건 제거**(매뉴얼·쇼츠·원본 추적·황금 채널 화면, 카드, 클라이언트). 설정 화면 `loading` 상태는 화면에서 쓰지 않아 제거.
- **`any` 35건 → 타입**: `src/lib/errors.ts`(`errorMessage`·`errorCode`·`errorStatus` — 예전처럼 값이 없으면 `undefined` → 기본 문구), `types.ts`에 `RawVideoResource`·`RawChannelResource`(videos/channels.list 원본 중 실제 쓰는 칸, 영상 `snippet.channelId` 필수), `YouTubeSearchItem`, `CaptionTrack`/`CaptionsData`, `scriptAnalyzer`의 `ParsedAnalysis`(AI JSON, 모든 칸 선택 — 기본값 채움 로직 그대로), 쇼츠 선택 상자는 상태 타입으로.
- **의도된 예외 10곳(이유 주석)**: 외부 유튜브 썸네일 `<img>` 6(next/image는 최적화 비용·원격 주소 설정 필요), 설정 키 목록 불러오기·휴대폰 메뉴 닫기·**즐겨찾기 불러오기(v1.14 Codex 로직 보존, 주석만)**.
- **이동 방식 1곳**: 대본 분석 AI 키 없음 → 설정 이동을 `window.location.href`에서 `router.push("/settings")`로(도착 화면 동일).
- 검수: `tsc` 0·`eslint` 0, `tests/favorites.test.mjs` 8개 통과, build, 배포·DB v1.15, 비로그인 `/api/favorites` 401, 크롬 시험 계정 매뉴얼·설정(저장된 키 3개 가린 값 표시)·쇼츠 선택 상자 변경 정상·콘솔 오류 0. 검색·AI 분석은 실행하지 않음(회원 키 사용).

## 2026-10-17 v1.16 — 보관함 1,000개 도달 안내(A안) (Claude Code 윈도우)
- 주인님 결정 A안: 실제 저장 0개(회원 0명)·30일 자동 삭제로 1,000개 제한 도달 가능성이 낮아, 완전한 페이지 나눔 대신 `favorites/page.tsx`에 "최신 1,000개만 표시" 안내(1,000개 이상일 때만). `src/lib/favorites.ts`에 `FAVORITES_LOAD_LIMIT = 1000` 공통 상수, `api/favorites`는 숫자 1000을 이 상수로만 바꿈(값·로직 동일, v1.14 Codex 구현 보존).
- 검수: tsc·eslint 0, 즐겨찾기 단위 8, build, 배포·DB v1.16, 비로그인 API 401, 크롬 보관함 정상(0개라 안내 미표시가 정상). 1,000개 상태는 DB 시험 자료가 필요해 코드 조건으로만 확인.
- 재검토 조건: 한 회원 저장이 수백 개 이상으로 늘면 B안(날짜 커서 페이지 나눔 + ⭐ 상태용 전체 읽기).

## 2026-10-17 v1.17 — 「황금 채널 발굴」 계산을 공용 기준 코드 사본으로 + 조건 4개 추가 (Claude Code 윈도우)
- 주인님 승인 ①안: CHANNEL CONSULTANT 「공략 채널 찾기」와 같은 기능이라 안쪽 계산을 기준 코드(consultant의 `goldenEngine.ts`) 사본으로 바꿨다. 두 프로그램은 서로를 호출하지 않는다.
- 바뀐 점: 화면 조건에 **검색 기간·영상 길이·국가·검색 깊이** 추가. 기본값은 예전과 같음(30일·쇼츠·전체·50개, 구독자 1만·평균 3만). 결과 카드·보관함·대본 분석은 그대로이고, 카드에 이번 검색에서 가장 많이 본 영상(`topVideo`)이 채워진다. 검색 뒤 할당량(약 유닛) 표시.
- 계산 차이(개선): 구독자 비공개 채널을 0명으로 계산하지 않고 제외. 떡상 지수 = 파괴력 배수 × 10(최대 100), 예전 식과 같음. 검색어에 붙이던 `#shorts`는 빼고 영상 길이 조건으로만 거른다. 결과 최대 20개.
- 바뀐 파일: `goldenEngine.ts`·`tests/goldenEngine.test.mjs`(사본, 신규), `goldenChannels.ts`(엔진 호출 + 카드 변환), `client.ts`(`youtubeCall` 추가), API `golden-channels`(공용 입력 정리 + 기본값), 화면 `golden-channels/page.tsx`, `types.ts`(안 쓰게 된 `GoldenChannelsParams` 삭제), 버전 v1.17.
- 검수: tsc 0, eslint(바뀐 파일) 0, build, 배포·DB v1.17, 크롬 화면(조건 6칸·기본값·v1.17·가로 넘침 없음).
- 사본·기준 확인: `node scripts/check-shared-modules.mjs` → 모두 OK. 공용 파일 테스트 3개(가짜 YouTube 응답) 통과. 실제 검색(할당량 사용)은 하지 않았고, 빈 키워드 요청이 서버에서 400으로 막히는 것까지 크롬으로 확인.
- **주의(다음 CLI)**: `src/lib/youtube/goldenEngine.ts`·`tests/goldenEngine.test.mjs`는 공용 기준 코드다. 기준은 `youtube-channel-consultant`이고 사본은 직접 고치지 않는다. 기준을 고친 뒤 `--sync` → 두 프로그램 모두 빌드·배포·버전 +0.01. 목록·절차: 루트 `docs/SHARED_MODULES.md`.

## 2026-10-17 v1.18 — 유튜브 조회를 공용 기준 코드 `youtube-data-client` 사본으로 (Claude Code 윈도우)
- `src/lib/youtube/youtubeData.ts`(사본) 추가. `client.ts`를 모듈 위임으로 다시 썼다(`youtubeGet`·`youtubeCall`·`fetchVideosDetails`·`fetchChannelsDetails`·`verifyYouTubeApiKey`, 이름·반환 형식 그대로). `trendingVideos.ts`·`viralShorts.ts`·`sourceFinder.ts`의 직접 호출 4곳도 위임.
- 동작 유지: 같은 요청 재사용 시간(검색 2분·영상 5분·채널 10분·원본 찾기 5분) 그대로, 원본 찾기의 보조 검색은 실패해도 예전처럼 빈 결과.
- 개선: 쇼츠·급상승 조회에서 한도 소진 등 오류를 영어 원문 그대로 보여 주던 것이 한국어 안내로 바뀜. 시간 제한·일시 오류 재시도·키 가리기 적용.
- 검수: tsc 0, eslint(lib/youtube) 0, 테스트 20(공용 2종 포함), build, 배포·DB v1.18, 크롬 화면 v1.18.
- **주의(다음 CLI)**: `src/lib/youtube/youtubeData.ts`·`tests/youtubeData.test.mjs`는 공용 기준 코드 `youtube-data-client`다. 기준은 `youtube-channel-consultant`이고 사본은 직접 고치지 않는다. 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync` → 사본을 쓰는 세 프로그램 모두 테스트·빌드·배포·버전 +0.01. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §1.

## 2026-10-17 v1.19 — 좌측 상단 프로그램 이름이 「...」로 잘리던 것 → 두 줄 표시(`line-clamp-2`, 13px) (Claude Code 맥미니)
- 주인님 승인(시험 계정 크롬 검수 중 발견·제안). 바뀐 파일: `src/components/layout/Sidebar.tsx`, 버전 파일. `tsc --noEmit` 오류 0.
- **빌드·배포·DB `v1.19`는 윈도우 CLI 대기**: `npm run build` → `vercel deploy --prod --yes` → `update programs set version='v1.19', updated_at=now() where slug='youtube-viral-studio';` → 1440·375px 제목 확인.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 병합 C 준비 — YOUTUBE CHANNEL CONSULTANT를 이 앱 안으로 (Claude Code 윈도우, 플랜 확인 대기·코드 변경 없음)
- 플랜 겸 인수인계: [`docs/PLAN_20261020_MERGE_C_CONSULTANT.md`](docs/PLAN_20261020_MERGE_C_CONSULTANT.md) — 조사 결과(옮길 파일 18개, 이름 충돌 `lib/youtube/{client,metrics,types}`, 공용 기준 코드 기준 위치, 권한 148명 모두 겹침), 3단계, 다음 첫 단계.

## 2026-10-20 v1.20 — 병합 C 1단계: YOUTUBE CHANNEL CONSULTANT 화면·기능 이식 (Claude Code 윈도우)
- CONSULTANT 전용 파일 21개 복사(스크립트 방식, 플랜 §3): 화면 `/channel-analysis`·`/keyword-analysis`, API `/api/youtube/channel`·`/api/youtube/keyword`·`/api/ai/analyze`, `components/ai/*`·`components/analysis/*`·`components/settings/GuideLinkButton.tsx`, `lib/ai/{llm,models,prompts}.ts`, `lib/export.ts`.
- 이름이 겹치는 CONSULTANT 유튜브 계산 코드 5개는 **`src/lib/consultant/youtube/{client,metrics,types,analysis,targets}.ts`**로 분리(VIRAL `lib/youtube/*`는 그대로). 그 안의 `./youtubeData`·`./goldenEngine`은 VIRAL의 같은 공용 사본(`@/lib/youtube/...`, 내용 동일 확인)을 씀.
- 공략 채널은 VIRAL `/golden-channels` 하나(같은 엔진, 선택 항목도 거의 같음 — 기본 조건만 달랐음), 메뉴 이름 「황금·공략 채널 발굴」. 좌측 메뉴 「🔥 트렌드 발굴」·「📊 채널·키워드 진단」 두 묶음.
- 공지 띠(`program-notice-banner` 사본, dark) 함께(배포 누락 방지 교훈).
- 검수: tsc, `npm run build`(새 경로 2개 생성), 공용 코드 점검 OK, 테스트 goldenEngine 3·favorites 8 통과.

## 2026-10-20 v1.21 — 병합 C 2단계: 이름 「YOUTUBE 트렌드 분석」·대시보드·매뉴얼 통합 (Claude Code 윈도우)
- 주인님 「YOUTUBE 트렌드 분석 으로 해줘 너무 길어」 → `APP_NAME`·브라우저 제목·대시보드 칩·매뉴얼 제목 변경(프로그램 slug·주소는 그대로 `youtube-viral-studio`).
- 대시보드: 「📊 채널·키워드 진단」 카드 2개(채널 분석·키워드 분석), 황금 카드 이름 「황금·공략 채널 발굴」, 연결 상태 문구(발굴·진단, AI 키에 Claude 포함).
- 매뉴얼 `/guide`: 「📊 채널·키워드 진단 사용법」 절(채널 분석·키워드 분석·AI 리포트·인기 점수), 팁 2개·FAQ 4개(CONSULTANT 매뉴얼에서), **주의 문구 「즐겨찾기는 이 브라우저에만 저장」 → 실제(계정 저장·30일 삭제)로 정정**.
- DB `programs.name`·소개는 3단계(카탈로그 정리)에서 바꿈.

## 2026-10-20 병합 C 3단계 완료 — 카탈로그 「YOUTUBE 트렌드 분석」 (Claude Code 윈도우)
- DB 이름·소개 갱신, CONSULTANT 노출 중지·옛 주소 이동, **공용 기준 코드 `youtube-data-client`·`youtube-golden-engine`(+테스트)의 기준이 이 폴더**(`src/lib/youtube/{youtubeData,goldenEngine}.ts`, `tests/`) — 고치면 `node scripts/check-shared-modules.mjs --sync`. 상세 플랜 §8.

## 2026-10-22 v1.22 — 대본 분석: Gemini가 유튜브 영상을 직접 보고 실제 대사까지 · 대사 → AI 쇼츠 원스톱 (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261022_VIDEO_TRANSCRIPT_HANDOFF.md`(주인님 승인).
- **발견(기존 기능 고장)**: `src/lib/youtube/transcript.ts` `fetchVideoTranscript`가 자막 주소는 찾지만 자막 응답이 200·0바이트 → 「✨ AI 떡상 대본 분석」이 사실상 모든 영상을 「자막 없음(제목·설명 기반 분석 모드)」으로 처리하고 있었음(유명 영상 2개 로컬 시험, `docs/ERROR_LESSONS.md` 2026-10-22). 코드는 지우지 않고 자막이 있을 때만 쓰게 둠.
- `src/lib/ai/scriptAnalyzer.ts`: Gemini 키가 있으면 먼저 `fileData.fileUri = https://www.youtube.com/watch?v=<id>`를 붙여 영상을 직접 보고 분석 + JSON `transcript`(실제 대사) 요청(`VIDEO_RULE`) → 실패(비공개·지역 제한 등)하면 기존 글 기반 Gemini → OpenAI 순서. 결과에 `transcript`(받아쓰기 또는 가져온 자막, 12000자), `hasOriginalScript`는 대사 20자 초과, 엔진 표시 「Google Gemini 2.5 Flash (영상 직접 분석)」.
- `ScriptAnalysisModal`: 대사가 있으면 「🎙 영상 대사(받아쓰기)」 접는 칸 + 「🎬 이 대사로 쇼츠 만들기」 → `https://shorts-onestop-studio.buylife.xyz/topic#ref-transcript=…` 새 탭. 넘기기 함수는 공용 `reference-copy-guard` 사본 `src/lib/reference.ts`(직접 고치지 말 것 — 기준 원스톱).
- 검수: tsc, build, 배포 `youtube-viral-studio-o7i5tuca2` Ready, DB v1.22. `test:runtime`·`test:fixtures`는 로컬 개발 서버(127.0.0.1:3028)를 띄워야 하는 화면 시험이라 이번에는 돌지 않았음(시험이 덮어쓴 `docs/evidence/v114/*.json` 2개는 되돌림). 크롬(시험 회원): 「#주식」 쇼츠 21개 → 첫 쇼츠 대본 분석 28초 「영상 직접 분석」 → 대사 528자 → 버튼 주소로 원스톱 v1.33 참고 자료에 레퍼런스 블록·안내 확인. 이 버튼의 오류 처리는 `alert()`라 시험 탭에서만 콘솔 기록으로 바꿔 두고 눌렀음.
- 회원 부담: Gemini 대본 분석이 영상을 직접 보게 되어 1회 비용이 조금 늘어남(1분 쇼츠 약 +$0.01~0.03, 회원 본인 키).
- 비용(이번 작업): 빌드 1회, Gemini 대본 분석 1회 약 $0.02~0.05(시험 회원 본인 키, 승인 범위).

## 2026-10-22 v1.23 — 대본 분석 오류를 카드 안 안내로 · 「AI로 영상 요약하기」(쇼츠) 대사 → AI 쇼츠 원스톱 (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261022_SUMMARY_TRANSCRIPT.md`(주인님 승인).
- `src/components/common/VideoCard.tsx`: 「✨ AI 떡상 대본 분석」 오류의 `alert` 2곳·`confirm` 1곳 → 카드 안 빨간 안내(`role="alert"`), 키가 없으면 「API키등록·플랫폼연동으로 가기 →」 링크. 쓰지 않게 된 `useRouter` 제거.
- `src/lib/ai/summaryScript.ts`(새): `SUMMARY_SCRIPT_MAX_SEC`(180)·`SUMMARY_SCRIPT_HEADING`(「## 영상 대사(받아쓰기)」)·`summaryScriptOf`(요약 글에서 대사 절만, 「없음」이면 빈 값). `src/lib/ai/prompts.ts` `video-summary`: 영상을 직접 볼 때(Gemini·15분 이하) 그중 3분 이하면 맨 끝에 대사 절 요청. `src/components/ai/AiPanels.tsx` 요약 창: 대사가 있으면 「🎬 이 대사로 쇼츠 만들기」 → 원스톱 `/topic#ref-transcript=…`(공용 사본 `src/lib/reference.ts`).
- 공용 `reference-copy-guard` 사본 동기화(겹친 구절 원문 글자, 이 프로그램은 구절을 화면에 보여 주지 않음).
- 검수: tsc, build, 대사 뽑기 함수 4경우(대사·「없음」·절 없음·다음 절 앞에서 끊기), 배포 `youtube-viral-studio-hyfue116w` Ready, DB v1.23. 크롬(시험 회원): 키워드 분석 「재테크」(영상 50개, YouTube 약 102유닛) → 42초 쇼츠 「AI로 영상 요약하기」 → 「영상을 직접 보고 분석」(Gemini 3.7 Flash)·대사 393자·버튼 → 원스톱 v1.33 참고 자료 블록 확인. 오류 안내(②)는 비용 없이 오류를 내기 어려워 코드 확인(`alert`·`confirm` 0곳)만.
- 발견: 대사가 「- **진행자**: "…"」처럼 마크다운 표시를 단 채 넘어감 — `docs/IMPROVEMENTS.md`.
- 비용: 빌드 1회, Gemini 영상 요약 1회 약 $0.02~0.05(시험 회원 본인 키, 승인 범위).

## 2026-10-22 v1.24 — 영상 요약 대사의 꾸밈 기호 정리 · 원스톱으로 넘기는 대사에 프로그램 이름 (Claude Code 윈도우)
- `src/lib/ai/summaryScript.ts` `plainScript`: 줄 앞 `- `·`* `·`• `와 `**`·`__`만 걷음(「진행자: "…"」 화자 이름 유지). 요약 창 표시는 그대로 마크다운.
- `ScriptAnalysisModal.tsx`·`AiPanels.tsx` 버튼이 `refHandoffHash(대사, APP_NAME)` — 원스톱 v1.34에 「YOUTUBE 트렌드 분석에서 넘겨받은…」. 공용 사본 동기화.
- 검수: tsc, 대사 뽑기(기호 섞인 대사 → 「진행자: "S&P500 아직도 사요?"\n게스트: 네, 정말로.」, 「없음」 → 빈 값), 배포 `youtube-viral-studio-cgf9bzuc8` Ready, DB v1.24. 플랜 `../shorts-onestop-studio/docs/PLAN_20261022_HANDOFF_SOURCE_NAME.md`.
