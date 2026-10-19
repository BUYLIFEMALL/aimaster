# 🤖 네이버 카페 포스팅 자동화 에이전트 인수인계 가이드 (AGENTS.md)

> **최종 갱신**: 2026-10-19 (Antigravity CLI `agy`)  
> **현재 버전**: `v1.22` (플로우 위저드 스타일 — 네이버 카페 그린 에디션)  
> **공식 서비스 URL**: [https://naver-cafe-poster.buylife.xyz](https://naver-cafe-poster.buylife.xyz)  
> **공식 가이드북**: [https://naver-cafe-poster.buylife.xyz/guide](https://naver-cafe-poster.buylife.xyz/guide)  
> **적용 디자인 템플릿**: **플로우 위저드 스타일 — 네이버 카페 그린 에디션 (Flow Wizard Style — Naver Cafe Green Edition)**

---

## 1. 프로그램 사용목적 및 대상 (Target & Purpose)

- **사용 목적**: 네이버 카페에서 활발히 활동하거나 카페 마케팅을 진행하는 회원이 뉴스, 블로그, 실시간 트렌드 검색(URL/RSS/Perplexity)을 통해 양질의 글감을 수집하고, 네이버 카페 특유의 친근한 구어체 및 정보성 글로 재구성하여 원하는 카페 게시판으로 즉시 및 예약 발행할 수 있도록 지원하는 올인원 카페 포스팅 자동화 SaaS 도구입니다.
- **주요 대상**:
  1. 네이버 카페 커뮤니티 운영자 및 매니저
  2. 카페 침투 마케팅 및 브랜드 인지도 제고를 원하는 1인 셀러 및 마케터
  3. 특정 전문 분야(IT, 부동산, 육아, 건강 등)의 데일리 이슈와 칼럼을 정기적으로 공유하는 크리에이터
  4. 다수의 카페 게시판에 일정한 간격으로 게시글을 스케줄링하여 안전하게 배포하고자 하는 사용자

---

## 2. 개발 도구 / 기술 스택 / 스킬 (Tech Stack & Skills)

- **Framework**: Next.js 16.2.11 (App Router, Turbopack)
- **Library**: React 19.2.4, Lucide React 1.44.0, Zod 4.4.3, Cheerio 1.2.0, Undici 8.10.1
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss";` 및 `@theme inline`), 플로우 위저드 네이버 카페 그린 토큰 시스템
- **Database & Auth**: Supabase SSR (`@supabase/ssr` 0.12.3, `@supabase/supabase-js` 2.110.8), 공유 DB `esgxyikcnnvmlhygjkth`
- **AI Engine & API**:
  - OpenAI GPT-4o-mini / GPT-4o
  - Google Gemini 2.5 Flash (`@google/genai`)
  - Perplexity API (Sonar 실시간 웹 검색)
  - 네이버 공식 Cafe API (OAuth 2.0 및 글쓰기 API)
- **보안 및 규정**: 100% BYOK(회원 본인 네이버 계정 및 AI API 키 등록), SSR 쿠키 기반 세션 인증 (`.buylife.xyz`)

---

## 3. 핵심 기능 및 시스템 아키텍처 / 로직 (Features & Architecture)

### 📌 4단계 포스팅 파이프라인 구조
1. **1단계: 플랫폼 & 카페 연동 (`/settings`)**:
   - 네이버 로그인(OAuth 2.0)을 통해 카페 글쓰기 권한 토큰을 발급받습니다.
   - 글을 올릴 카페 고유 ID(`club_id`)와 게시판 번호(`menu_id`)를 등록합니다.
2. **2단계: 3대 글감 소스 자동 수집 (`/candidates`)**:
   - HTTP URL: 특정 웹페이지 기사 크롤링 및 요약.
   - RSS 피드: NewsBlur 연동 구독 피드 자동 감지.
   - Perplexity 검색: 실시간 키워드 질의를 통한 팩트 중심 최신 트렌드 글감 수집.
3. **3단계: AI 자동 글쓰기 & 초안 검수 (`/drafts` & `/write`)**:
   - 카페 회원의 공감을 이끌어내는 친근한 구어체 어투로 제목과 본문 자동 생성.
   - 수동 글쓰기 에디터 및 초안 보관함에서 실시간 수정 후 저장.
4. **4단계: 카페 게시판 즉시 & 예약 발행 (`/posts`)**:
   - 검수된 초안을 네이버 공식 Cafe API를 통해 즉시 등록하거나 cron 스케줄러를 통해 예약 발행.

### 🌟 장점 및 강점
- **네이버 공식 API 연동**: 비정상 브라우저 매크로나 셀레니움 방식이 아닌 공식 API를 사용하므로 캡차(CAPTCHA)나 비인가 차단 위험이 없습니다.
- **다양한 글감 수집 파이프라인**: URL 하나만 넣거나 RSS를 등록해두면 매일 새로운 글감이 자동으로 쌓입니다.
- **완벽한 반응형 및 가이드북**: PC 및 모바일 375px 환경을 완벽 지원하며 `/guide`를 통해 누구나 5분 안에 카페 ID를 찾아 연동할 수 있습니다.

### ⚠️ 기술적 주의사항 및 한계점
- 네이버 정책상 카페 목록을 API로 제공하지 않으므로, 글을 올릴 카페의 `club_id`와 게시판의 `menu_id`를 사용자가 직접 확인해 등록해야 합니다. (가이드북에서 상세 안내)
- 네이버 로그인 토큰이 만료되면 글 발행이 일시 중지되며, 설정 화면에서 재연동 버튼 클릭이 필요합니다.

---

## 4. 현재 버전 및 버전 히스토리 (Changelog)

- **v1.22 (2026-10-20, Claude Code 윈도우) — 정기 실행 직전 프로그램 이용 권한 확인** — 주인님 지시. 예전엔 핸드폰 번호만 확인해 사용기간이 끝난 회원의 켜 둔 정기 실행도 계속 돌았다. `src/lib/programAccess.ts`(카드뉴스·메인 사이트와 같은 판정: 정지→관리자→핸드폰→FREE→구독→등급+사용기간, 사본)를 실행 로직에서 회원별 1회 확인, 권한 없으면 실행하지 않음(소스 `last_error`에 안내). 적용 시점 영향: 정기 실행 켜진 1건 모두 권한 있음(멈춘 회원 0명). 검수: tsc 0, build, 배포 `naver-cafe-poster-ffkx9bw4o`, DB v1.22.
- **v1.21 (2026-10-20, Claude Code 윈도우) — ⏰ 정기 자동 실행 방식 회원 선택(AIMaster 기본 Vercel / 본인 cron-job.org) + 중복 실행 방지·비밀값 검사 보완** — 주인님 「정기형에도 적용」. 지침 루트 `docs/SCHEDULER_POLICY.md`, 플랜 `docs/PLAN_20261020_MEMBER_SCHEDULER.md`, 기준 `threads/` v1.19.
  - 정기형 차이: 작업은 **정기 실행 스위치를 켤 때** 켜고 **켜진 정기 소스가 0개면** 끈다(소스 끄기·삭제·회원 실행 뒤 확인). cron-job.org 확인 주기 **5분**(`minutes` 0,5,…,55). 24시간 규칙 대신 기존 `isScheduleDue`(주기) 그대로.
  - 코드: `src/lib/scheduledSource/cronJobOrg.ts`·`memberScheduler.ts`(표 `ncafe_member_scheduler`, 토큰 `ncafe_…` DB엔 해시, 끄기 스위치 `NCAFE_PLATFORM_SCHEDULER=off`, 기본 Vercel, `remainingScheduled` = 켜진 정기 소스 수), `dispatch.ts`(운영자 주소에서 옮긴 실행 로직 + 옵션 `userId`·`excludeUserIds`·`failWithMessage` + **조건부 `last_run_at` 선점** — 일시 오류면 선점 값을 되돌려 예전처럼 다음 5분에 재시도, 후보 없음은 엔진이 바꾼 값 유지), `/api/cron/generate-and-post`(vercel·비일시정지 회원만, **`CRON_SECRET` 비어 있으면 401** — 예전엔 `Bearer undefined`로 통과 가능), 새 `/api/cron/dispatch-member`(회원 토큰, 즉시 응답 + `after`, 켜진 소스 0개면 작업 끔), `src/lib/actions/scheduler.ts`(방식·일시정지·재개), `scheduledSources.ts` 등록·스위치·삭제 때 `syncMemberScheduler`(켤 때 준비 안 됐으면 스위치를 다시 끄고 안내), `settings.ts` 키 허용·변경·삭제.
  - 화면: 설정 「⏰ 예약 발행」(`SchedulerModePicker` + 키 칸 + 가입 3단계), 글감 수집 「정기 자동 실행」 상태 줄·일시정지/재개(`components/candidates/SchedulePublishingControl.tsx`), `/guide` FAQ.
  - DB(운영 `esgxyikcnnvmlhygjkth`): `supabase/migrations/20261020110000_ncafe_member_scheduler.sql` — 2026-10-20 크롬 SQL Editor로 적용, 결과 `ncafe_member_scheduler`·`v1.21`.
  - 검수: tsc 0, build(새 주소 포함), 배포 `naver-cafe-poster-oun9zc23z`(Ready), 무인증·`Bearer undefined`·가짜 토큰 401, `/login` 200, 새 배포 운영자 실행 200·회원 실행(cron-job.org 호출) 200. 크롬(관리자 본인 키, **실제 카페 게시 없음** — 관리자에게 네이버 연결·게시판이 없어 시험용 게시판·소스를 「정기 실행 꺼짐·마지막 실행=지금·매주」로 DB에 넣어 차례가 오지 않게 함): 「내 cron-job.org」 선택 → 소스 스위치 켜기 → 작업 8678746 자동 생성·켜짐 → 상태 줄 「실행 중 · 켜진 정기 실행 1개」 → 일시정지·재개 → 회원 실행 200인데 소스 미실행(차례 아님) → 스위치 끄기 → 작업 즉시 꺼짐 → Vercel 복귀 → 시험 데이터 삭제.

- **v1.20 (2026-10-19, Antigravity CLI)**:
  - **플로우 위저드 스타일 — 네이버 카페 그린 에디션** 전면 디자인 리뉴얼.
  - 글로벌 스타일 토큰(`globals.css`) 구축: 네이버 카페 그린(`#03c75a`), 웜 슬레이트 라이트(`#f8fafc`).
  - 사이드바 네비게이션 리뉴얼: 1-2-3-4 단계 넘버링 스텝퍼, 모바일 햄버거 토글 드로어 완비.
  - 독립 비주얼 가이드북 (`/guide`) 전면 신설: 4단계 파이프라인, club_id 추출 매트릭스, 3대 소스 비교표, FAQ 5종 아코디언.
  - 메인 대시보드 리뉴얼: 초록빛 `.studio-hero` 배너, 3대 핵심 KPI 지표 카드, 퀵 가이드 버튼 탑재.
  - Next.js 16 프로덕션 빌드 무결성 검증, Vercel 배포, Edge 포그라운드 6종 실세션 검수 완료.
- **v1.15 (2026-09-15)**:
  - 예약 자동 생성·포스팅 스위치 추가 및 화면 명칭 "네이버 카페 포스팅 자동화"로 표준화.
- **v1.00 (2026-09-11)**:
  - 네이버 카페 포스팅 자동화 초기 스캐폴딩 및 네이버 OAuth/Cafe API 연동.

---

## 5. 남아 있는 추가 작업 대기 내용 (Pending Tasks & Backlog)

- [ ] **이미지 자동 첨부 파이프라인 강화**: 카페 글 작성 시 AI 생성 이미지(`ai-image-studio`)나 글감 본문 이미지를 네이버 카페 이미지 업로드 API로 본문에 자동 삽입하는 기능.
- [ ] **다중 카페 계정 스위처**: 여러 개의 네이버 계정(부계정, 매니저 계정 등)을 등록해두고 글 작성 시 계정을 선택할 수 있는 멀티 계정 기능.
- [ ] **카페 댓글 모니터링 연계**: 내가 올린 카페 게시글에 새 댓글이 달렸을 때 알림을 받고 AI로 답글을 작성할 수 있는 기능.
- 상세 백로그는 `docs/IMPROVEMENT_BACKLOG.md`를 참고하십시오.

---

## 6. 타 프로그램 연계 및 혁신 아이디어 (Integration Ideas)

1. **AI 블로그 작업실 (`blog-workroom`) 연계**:
   - 블로그에 발행된 고품질 포스팅을 네이버 카페 회원들이 읽기 좋은 요약형 커뮤니티 글로 원클릭 변환하여 카페로 동시 발행.
2. **AI 이미지 스튜디오 (`ai-image-studio`) 연계**:
   - 카페 글 내용에 어울리는 대표 썸네일 및 본문 삽화를 DALL-E / Gemini로 자동 생성하여 글과 함께 카페에 업로드.
3. **롱테일 키워드 분석 (`longtail-keyword-expander`) 연계**:
   - 네이버 카페 내 검색 상위 노출을 위해 카페 회원들이 자주 검색하는 롱테일 키워드를 제목과 본문 첫 문단에 자동 배치.

---

## 7. 디자인 UI/UX 개선안 및 스타일 제안 (UI/UX Proposals)

1. **카페 게시판별 템플릿 프리셋 기능**:
   - "가입인사 게시판", "자유수다 게시판", "정보공유 게시판" 등 게시판 성격에 따라 어투와 서식을 미리 저장해두고 원클릭 적용.
2. **글자수 및 미리보기 에디터 고도화**:
   - 네이버 카페 모바일 앱에서 글이 어떻게 보일지 실시간으로 스마트폰 목업 프레임으로 미리보기 지원.
3. **예약 캘린더 뷰 (월간/주간)**:
   - 현재 리스트 형태로만 제공되는 예약 발행 일정을 캘린더 형태의 그리드로 시각화하여 배포 스케줄을 한눈에 조망.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->
