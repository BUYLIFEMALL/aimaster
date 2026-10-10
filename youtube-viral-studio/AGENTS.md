# 유튜브 떡상 쇼츠 발굴 자동화 — AI 에이전트 인수인계 문서 (AGENTS.md)

> # ★★★ 최상위 절대 불변 규칙 (2026-10-09 주인님 지시)
> **모든 사용자는 본인의 계정과, 본인이 사용할 본인 YouTube API 키 및 AI 키(Gemini/OpenAI)를 각각 직접 등록·연동해서 사용한다.**
> 운영자(주인님)나 타인의 키로 대신 처리하지 않으며, 키가 없으면 "본인 키를 등록해주세요"로 안내한다.

---

## 1. 개요 & 버전 현황
- 프로그램명: **유튜브 떡상 쇼츠 발굴 자동화**
- Slug: `youtube-viral-studio`
- 현재 버전: `v1.05` (`src/lib/version.ts`, `package.json`, DB `programs.version`)
- 공식 라이브 URL: [https://youtube-viral-studio.buylife.xyz](https://youtube-viral-studio.buylife.xyz)
- Vercel URL: [https://youtube-viral-studio.vercel.app](https://youtube-viral-studio.vercel.app)
- 기반 환경: Next.js 16.2.11 + React 19 + Tailwind CSS v4 + Supabase SSR
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
- 화이트 베이스 표준 레이아웃 (`docs/SIDEBAR_LAYOUT_STANDARD.md` 준수)
- `/viral-shorts`: 조회수 폭발 쇼츠 찾기 (메인) + **[✨ AI 떡상 대본 분석] 원클릭 모달 연동**
- `/golden-channels`: 황금 채널 발굴기
- `/trending-videos`: 실시간 터진 영상 (VPH 뱃지, 쇼츠/롱폼 탭)
- `/source-finder`: 쇼츠 원본 찾기
- `/favorites`: 즐겨찾기 보관함 (CSV 내보내기 지원)
- `/settings`: YouTube Data API v3 키 + Gemini / OpenAI API 키 설정
- `/guide`: 핵심 지표 해석 및 이용 가이드
