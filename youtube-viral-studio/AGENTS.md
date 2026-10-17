# YOUTUBE VIRAL FINDER — AI 에이전트 인수인계 문서 (AGENTS.md)

> # ★★★ 최상위 절대 불변 규칙 (2026-10-09 주인님 지시)
> **모든 사용자는 본인의 계정과, 본인이 사용할 본인 YouTube API 키 및 AI 키(Gemini/OpenAI)를 각각 직접 등록·연동해서 사용한다.**
> 운영자(주인님)나 타인의 키로 대신 처리하지 않으며, 키가 없으면 "본인 키를 등록해주세요"로 안내한다.

---

## 1. 개요 & 버전 현황
- 프로그램명: **YOUTUBE VIRAL FINDER**
- Slug: `youtube-viral-studio`
- 현재 버전: `v1.14` (운영 배포·회원 보관 검수 완료) (`src/lib/version.ts`, `package.json`, DB `programs.version`)
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
