# Threads 포스팅 자동화 (auto-threads-posting) AI 에이전트 인수인계서

> **프로그램명**: Threads 포스팅 자동화 (`auto-threads-posting`)  
> **공식 서비스 URL**: https://auto-threads-posting.buylife.xyz  
> **현재 버전**: `v1.21`  
> **적용 디자인 템플릿**: **스레드 바이럴 스튜디오 스타일 (Threads Viral Studio Style)**  
> **관리자 계정**: `buylifemall@gmail.com`  
> **일반 테스트 계정**: `buylifemall@naver.com`

---

## 1. 프로그램의 사용목적 및 대상
- **사용 목적**: Meta Threads 공식 Graph API와 최신 AI 모델(OpenAI / Gemini / Perplexity)을 결합하여 실시간 트렌드/RSS 글감 수집, 500자 맞춤형 바이럴 카피라이팅, 고화질 AI 일러스트 조립, 즉시 및 피크 시간대 예약 발행을 자동화하는 소셜 미디어 운영 솔루션.
- **주요 대상**: 
  - 계정 성장 및 퍼스널 브랜딩을 위해 매일 꾸준한 스레드 포스팅이 필요한 크리에이터.
  - 마케팅 및 브랜드 인지도 제고를 원하는 1인 기업, 스타트업 및 소상공인.
  - 다계정 및 예약 포스팅을 통해 체계적인 SNS 퍼널을 운영하고자 하는 마케터.

---

## 2. 개발 구현에 사용된 도구 / 개발기법 / 플러그인 / 스킬
- **프레임워크 & 런타임**: Next.js 16.2.11 (App Router, Turbopack), React 19, TypeScript.
- **스타일링 & UI 시스템**: Tailwind CSS v4, Lucide React 아이콘.
- **백엔드 & 데이터베이스**: Supabase (PostgreSQL, Row Level Security 회원 데이터 격리), Next.js Server Actions.
- **AI & 미디어 통합**:
  - 텍스트 생성: OpenAI GPT-4o / Claude 3.5 Sonnet / Perplexity API (회원 BYOK).
  - 이미지 생성: Google Gemini 정식 API (`gemini-nano-banana-2.1`, `gemini-3-pro-image`, `gemini-3.1-flash-lite-image`).
- **인증 및 계정 연동**: Meta Threads Official Graph API OAuth 2.0 (회원 본인 Meta 앱 ID/Secret 등록 BYOK 방식).
- **품질 검증 도구**: Microsoft Edge 포그라운드 (`headless: false`) 실세션 자동화 스크립트 (`playwright-core`), Next.js Turbopack 정적/동적 빌드 분석.

---

## 3. 핵심 기능 및 시스템 로직 / 아키텍처, 장점 및 단점

### 1) 핵심 기능 및 시스템 로직
- **글감 수집 및 자동 요약 (`/candidates`)**: 뉴스 RSS 및 사용자 지정 키워드를 주기적으로 수집하고 AI를 통해 핵심 포인트를 요약하여 글감 데이터베이스 구축.
- **AI 캡션 생성 및 이미지 결합 (`/posts`)**: Threads 알고리즘에 최적화된 500자 이내 후킹 캡션 생성 및 나노바나나 고화질 이미지 원클릭 생성/업로드.
- **즉시 및 스케줄 예약 발행 (`/api/posts/dispatch-scheduled`)**: 지정된 예약 시간에 맞춰 백그라운드 크론이 Threads 컨테이너 생성 및 발행을 자동으로 수행.
- **비주얼 연동 및 사용 매뉴얼 (`/guide`)**: Meta 앱 등록부터 OAuth 콜백, 테스터 추가, 포스팅 알고리즘 공략 팁까지 한곳에서 제공하는 4단계 인터랙티브 가이드북.

### 2) 시스템 아키텍처 및 장점
- **엄격한 BYOK 및 회원 격리**: 회원 본인의 Meta 앱 및 AI API 키만 사용하며, 타 회원이나 운영자 키로 폴백되지 않아 보안과 계정 독립성이 완벽함.
- **가벼운 Turbopack 번들**: 불필요한 서드파티 라이브러리를 배제하고 Next.js 최신 런타임을 활용하여 빠른 응답 속도 제공.
- **공용 이미지 엔진 탑재**: `ai-image-studio` 기준 코드 기반의 `geminiImage.ts` 사본 모듈로 안전한 재시도 및 이중 과금 방지 로직 적용.

### 3) 단점 및 한계점
- 단일 포스트당 1장의 이미지 중심 구조(현재 다중 이미지 캐러셀 미지원).
- 본문이 500자를 초과할 경우 자동으로 댓글(타래)로 이어주는 체인 기능 미탑재.

---

## 4. 현재 버전 및 버전별 변경 히스토리

### `v1.21` (2026-10-20) - Claude Code (윈도우) — 회원 연동 정보 공용 저장 ②단계 시범 (Threads 계정 한 번 연결 → 여러 Threads 프로그램 함께 사용)
- 루트 [`docs/MEMBER_INTEGRATIONS.md`](../docs/MEMBER_INTEGRATIONS.md)·플랜 [`docs/PLAN_20261020_MEMBER_INTEGRATIONS.md`](../docs/PLAN_20261020_MEMBER_INTEGRATIONS.md). 공용 부품 사본 `src/lib/memberIntegrations.ts`(기준 루트 `lib/memberIntegrations.ts`, `check-shared-modules.mjs` 「member-integrations」 — 사본 직접 수정 금지).
- `src/lib/threads/memberAccount.ts`: `getThreadsAccountForUser()` = 공용 표 `member_platform_accounts`(게시 권한 있고 재연결 필요 아님) → 없으면 `threads_accounts`. 즉시 게시(`actions/posts.ts`)·예약 발행(`posts/dispatch.ts`)·설정/대시보드/새 글/글 상세/수정 화면이 모두 이 함수로 읽음.
- 연결 콜백: `threads_accounts` 저장 + 공용 표에도 저장(이중 기록, 권한 `threads_basic,threads_content_publish`, `app_ref`=회원 Threads 앱 ID). 공용 저장 실패는 로그만(연결은 그대로).
- 연결 해제: `threads_accounts` + 공용 표 Threads 계정 함께 삭제. 설정 화면에 「해제하면 함께 쓰는 다른 Threads 프로그램에서도 해제」, 다른 프로그램에서 연결한 계정이면 「다른 프로그램(…)에서 연결한 계정을 함께 사용 중」 안내.
- 운영 DB: `supabase/migrations/20261020100000_member_integrations_v1_21.sql` — 이 프로그램 표의 **만료되지 않은 연결만** 공용 표로 백필(원본 유지) + `programs.version` v1.21.
- 함께 나감(버전 없이 배포됐던 agy 변경 `fd69da1d`): 설정 화면 Meta 주소 카드 배경 밝게(`ThreadsMetaAddressSummary`·`CopyAddress`).

### `v1.20` (2026-10-19) - Claude Code (윈도우) — 날짜·예약 시각 한국 시간 표시
- 서버 화면(`dashboard`·`posts`·`posts/[id]`·`settings` 페이지)이 `toLocaleString("ko-KR")`를 시간대 없이 써서 Vercel(UTC) 기준으로 그려 9시간 이르게 보였다(INSTA v1.25 검수 중 같은 문제 발견). 6곳 + `CandidateList` 1곳에 `timeZone: "Asia/Seoul"`. 버전 기록 `supabase/migrations/20261019260000_kst_display_v1_20.sql`(구조 변경 없음).
- 검수: tsc 0, build, 배포 `threads-jkaysjfgy`(Ready), DB v1.20, 크롬: 게시글 관리 첫 글 「2026. 8. 25. 오전 12:12:46」 = DB `2026-08-24T15:12:46Z`의 한국 시각(고치기 전엔 「8. 24. 오후 3:12」).

### `v1.19` (2026-10-19) - Claude Code (윈도우) — 예약 발행 실행 방식 회원 선택(Vercel / 본인 cron-job.org) + 중복 발행 방지
- 지침: 루트 [`docs/SCHEDULER_POLICY.md`](../docs/SCHEDULER_POLICY.md), 플랜: [`docs/PLAN_20261019_MEMBER_SCHEDULER.md`](docs/PLAN_20261019_MEMBER_SCHEDULER.md). 기준 구현 `threads-affiliate-poster` v1.63을 이 프로그램에 맞춤 — **배포판(설치 키트) 모드가 없는 운영 전용이라 기본 방식은 항상 Vercel**.
- 화면: 설정 「⏰ 예약 발행」(방식 선택 `components/settings/SchedulerModePicker.tsx` + cron-job.org 키 `ApiKeyRow`, 공용 provider `cronjob_org_api_key` — 다른 프로그램에서 넣은 키면 「등록됨」), 게시글 관리 위 상태 줄·전체 일시정지/재개(`components/posts/SchedulePublishingControl.tsx`), `/guide` FAQ·예약 시각 안내 문구.
- 코드: `src/lib/posts/cronJobOrg.ts`·`memberScheduler.ts`(표 `atp_member_scheduler`, 토큰 `atp_…` DB엔 해시, 끄기 스위치 환경변수 `ATP_PLATFORM_SCHEDULER=off`), `src/lib/actions/scheduler.ts`, `actions/posts.ts` 예약 전 방식·키 확인 + 예약 뒤 작업 켜기(실패 시 초안으로), `actions/settings.ts` 키 변경(방식 유지)·삭제(Vercel로), 새 주소 `/api/posts/dispatch-member`(회원 토큰, 즉시 응답 + `after`, 남은 예약 0건이면 작업 끔), `/api/posts/dispatch-scheduled`는 vercel·비일시정지 회원만.
- **중복 발행 방지·24시간 규칙(새로 추가)**: `dispatch.ts`가 글마다 `scheduled → publishing` 조건부 update로 먼저 가져간 실행만 발행, 예약 시각이 24시간 넘게 지난 글은 올리지 않고 실패 처리. 회원 실행에도 핸드폰 필수 정책 적용.
- DB(운영 `esgxyikcnnvmlhygjkth`): `supabase/migrations/20261019230000_atp_member_scheduler.sql`(표 + RLS 본인 조회 + `programs.version` v1.19). **표가 없으면 운영자 예약 실행이 오류로 멈추므로 반드시 DB 적용 후 배포.** → 2026-10-19 주인님 승인 후 크롬(주인님 로그인 Supabase SQL Editor, AIMaster·PRODUCTION 확인)으로 적용, 결과 `atp_member_scheduler`·`v1.19` 확인.
- 배포: `threads-80uxhi9g1`(Ready). 운영 주소 `/api/posts/dispatch-member`·`/api/posts/dispatch-scheduled` 무인증 401, 가짜 회원 토큰 401, `/login` 200.
- 2026-10-18 미배포 예약 안내 문구도 이번 배포에 함께 나감. 검수: tsc 0, `npm run build`(`/api/posts/dispatch-member` 포함).
- **크롬 실검수(2026-10-20, 관리자 본인 키, 실제 게시 없음): 「내 cron-job.org」 선택(공용 키 「등록됨」) → 시험 글 10-21 21:00 예약(`12:00Z`) → 작업 8678578 자동 생성·켜짐 → 상태 줄 「실행 중 · 대기 1건」 → 일시정지(`paused`)·재개 → 수정 화면에서 임시저장 → 약 60초 뒤 작업 자동 꺼짐 → Vercel 복귀. 상세 화면 「예약 게시 시각: 오후 9:00:00」(v1.20 시각 수정 확인). 시험 글은 초안으로 남김(30일 뒤 자동 삭제). 주의: 새 글 화면의 「게시물 생성하기」는 AI 글+나노바나나 이미지를 **무조건 자동 생성**하므로 시험 때 AI 글 1회·이미지 1장이 관리자 키로 나감 — 다음 검수는 수정 화면(자동 생성 꺼짐)이나 기존 초안으로 할 것.**

### `v1.18` (2026-10-18) - Claude Code (윈도우)
- 예약 게시 자동 실행 주기를 하루 1번(`0 0 * * *`, 한국시간 오전 9시) → **5분마다**(`*/5 * * * *`)로 변경(`vercel.json`). 예약 시각이 지나도 다음 날 오전 9시까지 밀리던 문제 수정. `CRON_SECRET` 기존 등록값 사용(환경변수 변경 없음). 변경 전 밀린·예정 예약 글 0건 확인(한꺼번에 발행될 글 없음).
- 검수: Vercel cron 목록 `*/5 * * * *` 등록, 비밀값 없는 호출 401, 01:45:38 첫 자동 실행 GET 200. DB `programs.version` v1.18.

### `v1.17` (2026-10-17) - Antigravity (`agy`)
- **스레드 바이럴 스튜디오 스타일 (Threads Viral Studio Style)** 전면 리뉴얼:
  - 다크 테마 캔버스(`#171717`), 카드(`#1f1f1f`), 앰버(`#f59e0b`) & 바이올렛(`#8b5cf6`) 포인트 컬러 적용.
- **모바일 반응형 완비**: 375px 상단 고정 헤더(`h-14`), 앱 타이틀 & 버전 뱃지, 부드러운 슬라이드 햄버거 드로어 메뉴 신설.
- **사용 매뉴얼 라우트 (`/guide`) 완전 신규 구축**:
  - 🤖 AI 마스코트 배너, 4단계 파이프라인 가이드, Meta 공식 OAuth 3단계 가이드(콜백 주소 복사), 500자 제약 및 알고리즘 공략 팁, FAQ 4종.
- **대시보드 (`/dashboard`) 다크 정돈**: 가이드 바로가기 카드, 통계 카운터 5종 시인성 개선.
- Supabase DB `programs` 테이블 `v1.17` 갱신 및 Vercel 배포 완료.
- Microsoft Edge 포그라운드 실세션 검수(데스크톱/모바일 5종 캡처) 통과.

### `v1.16` ~ `v1.11` (2026-10-17 ~ 2026-10-18) - Claude Code
- 공용 이미지 기준 코드(`gemini-image-client`) 동기화: 시간 초과 이중 과금 방지, Google 사용량 주소 안내, 최신 정식 나노바나나 2.1 모델 적용.

### `v1.10` ~ `v1.06` (2026-10-16 ~ 2026-10-17) - Claude Code
- 도메인 통일(SSO, `https://auto-threads-posting.buylife.xyz`), 설정 화면 주소 카드 및 원클릭 복사 컴포넌트 추가, DB 연동 변수 표준화.

---

## 5. 남아 있는 추가 프로그램 및 디자인 작업 대기 내용
- 상세 백로그는 [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) 참조:
  1. 다중 이미지(캐러셀, 최대 10장) 일괄 업로드 파이프라인 연동.
  2. 500자 초과 시 첫 번째 댓글(타래/Chain) 자동 생성 및 발행 엔진.
  3. 실시간 모바일 Threads 피드 미리보기(WYSIWYG Mockup) 컴포넌트 탑재.
  4. 예약 포스트 주간/월간 캘린더 그리드 뷰 도입.

---

## 6. 기존 다른 프로그램과의 연계 / 기능 병합 제안 및 기능 보완 아이디어
- **`threads-creator` (기획 자동화)**: 기획된 고효율 포스트 초안을 본 포스팅 자동화 프로그램으로 원클릭 전송하여 바로 스케줄 예약.
- **`threads-affiliate-poster` (제휴 자동화)**: 정보성 글과 수익형 제휴 글을 8:2 비율로 혼합하여 스케줄러가 번갈아 발행하도록 자동 믹서 연계.
- **`threads-analytics` (성과 분석)**: 본 프로그램에서 발행된 게시글의 ID를 분석기로 전달하여 실시간 반응(좋아요/댓글/리포스트)을 수집하고, 가장 인기가 높은 시간대를 본 프로그램 예약 엔진에 피드백.

---

## 7. 사용자 편의성 증대를 위한 디자인 UI 개선안과 레이아웃/테마 변경 제안
- **원형 글자 수 프로그레스 바**: 500자 제한 임박 시(450자 이상) 노란색/빨간색으로 시각적 경고를 주는 인라인 차트 제공.
- **드래그 앤 드롭 예약 스케줄러**: 캘린더 상에서 예약 포스트를 마우스 드래그로 손쉽게 날짜와 시간을 변경할 수 있는 직관적인 UI 제공.
- **AI 생성 이미지 실시간 크롭 도구**: 1:1, 4:5 등 Threads 최적화 비율로 이미지를 손쉽게 자르고 필터를 적용하는 인앱 미니 에디터 지원.

## 2026-10-18 — 예약 화면 안내 문구 「예약 시각 후 5분 안에 자동으로 발행됩니다」 (Claude Code 윈도우, **미배포 — 다음 배포 때 함께**)
- `src/components/posts/PostForm.tsx` 예약 시각 입력란에 안내 추가. 정확히 그 분에 안 올라가도 회원이 헷갈리지 않게(예약 게시 누락 방지 ②, 플랜 `docs/PLAN_20261018_SCHEDULED_DISPATCH_MONITOR.md`).
- 급하지 않은 화면 문구라 비용 규칙에 따라 커밋만 함. **다음에 이 프로그램을 배포하는 CLI는 버전 +0.01(코드·DB)하고 버전 기록에 이 항목을 넣을 것.** 검수: tsc 0.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->
