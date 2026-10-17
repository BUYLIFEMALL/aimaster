# YOUTUBE VIRAL FINDER — AI 에이전트 인수인계 문서 (AGENTS.md)

> # ★★★ 최상위 절대 불변 규칙 (2026-10-09 주인님 지시)
> **모든 사용자는 본인의 계정과, 본인이 사용할 본인 YouTube API 키 및 AI 키(Gemini/OpenAI)를 각각 직접 등록·연동해서 사용한다.**
> 운영자(주인님)나 타인의 키로 대신 처리하지 않으며, 키가 없으면 "본인 키를 등록해주세요"로 안내한다.

---

## 1. 개요 & 버전 현황
- 프로그램명: **YOUTUBE VIRAL FINDER**
- Slug: `youtube-viral-studio`
- 현재 버전: `v1.13` (Windows 배포 검수 진행 중) (`src/lib/version.ts`, `package.json`, DB `programs.version`)
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
- `apiKeys.ts`: 회원별 본인 API 키(`youtube_api_key`, `gemini_api_key`, `openai_api_key`) 조회 및 마스킹

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
