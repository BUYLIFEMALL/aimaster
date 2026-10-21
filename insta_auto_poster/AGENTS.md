# INSTA 포스팅 자동화 (`insta_auto_poster`) AI 에이전트 인수인계 문서 (AGENTS.md)

> # ★★★ 최상위 절대 불변 규칙 (2026-10-09 주인님 지시)
> **모든 사용자는 본인의 계정과 본인 API 키(Gemini·OpenAI·Claude·Perplexity) 및 본인 Meta 앱 정보를 각각 직접 등록·연동해서 사용한다.**
> 운영자(주인님)나 타인의 키로 대신 처리하지 않으며, 키가 없으면 "본인 키를 등록해주세요"로 안내한다. 상세: 루트 `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`.
> **생성 데이터도 회원 본인 소유로 격리하며 다른 회원과 공유·복사·재사용하지 않는다.**

---

## 1. 프로그램의 사용목적 및 대상
- **프로그램명**: INSTA 포스팅 자동화 (영문 `INSTA Auto Posting` / `insta_auto_poster`)
- **서비스 URL**: https://auto-instagram-posting.buylife.xyz
- **사용 목적**: 인스타그램 피드 및 캐러셀 콘텐츠의 소재 수집(HTTP/RSS/Perplexity)부터 AI 캡션·해시태그·고화질 나노바나나 이미지 생성, 그리고 Meta 공식 Graph API를 통한 즉시/예약 포스팅까지 전 과정을 자동화하는 인스타그램 전문 마케팅 솔루션.
- **주요 대상**:
  - 인스타그램 계정을 정기적으로 육성하고 있는 1인 크리에이터 및 인플루언서
  - 매일 트렌드 피드 및 지식 콘텐츠를 안정적으로 포스팅해야 하는 SNS 마케터
  - 인스타그램 비즈니스/크리에이터 계정 운영사 및 쇼핑몰 셀러

---

## 2. 개발 구현에 사용된 도구 / 개발기법 / 플러그인 / 스킬
- **프레임워크 & 런타임**: Next.js 16.2.11 (App Router, Turbopack), React 19, TypeScript
- **스타일링**: Tailwind CSS v4, 인라인 테마 CSS 변수
- **디자인 템플릿**: **플로우 위저드 스타일 (인스타 바이럴 변형)** 다크 테마 (`bg-[#0d0f17]`, 서피스 `#161922`, 보더 `#262c3d`, 인스타 로즈/핑크 그라디언트)
- **반응형 아키텍처**: 데스크톱(1440px) 260px 좌측 사이드바 + 모바일(375px) 상단 56px 고정 헤더 & 슬라이드 오버레이 드로어
- **백엔드 & 데이터베이스**: Supabase SSR (공유 DB `esgxyikcnnvmlhygjkth`), PostgreSQL RLS (회원별 데이터 엄격 격리)
- **외부 연동 API**: Meta Graph API v20+ (Facebook 로그인 페이지 연동 & Instagram 비즈니스 로그인 BYOK 연동)
- **AI 모델 연동**: Google Gemini (`gemini-nano-banana-2.1`, `gemini-3-pro-image`), OpenAI GPT-4o, Anthropic Claude 3.7 Sonnet, Perplexity Sonar

---

## 3. 핵심 기능 및 시스템 로직 / 아키텍처, 장점 및 단점
### 핵심 기능 (5단계 파이프라인)
1. **1단계 AI 키 등록 (`/settings`)**: Gemini(이미지), OpenAI/Claude(캡션), Perplexity(트렌드 검색) 회원 본인 키 등록.
2. **2단계 Meta 앱 & 인스타 연결 (`/settings`)**:
   - 📘 **Facebook 페이지 방식 (파란 버튼)**: 인스타그램이 Facebook 페이지에 연결된 공식 경로 (Meta 앱 ID/시크릿).
   - 📗 **Instagram 로그인 방식 (초록 버튼)**: Instagram 전용 앱 ID/시크릿을 통한 직접 연결.
3. **3단계 게시글 주제 수집 (`/candidates`)**: HTTP 웹 크롤링, RSS 구독 피드, Perplexity 실시간 트렌드 검색으로 글감 자동 발굴.
4. **4단계 AI 생성 (`/posts/new`)**: 단일 피드(1장) 또는 카드뉴스(캐러셀 4장) 선택, 캡션·25개 해시태그 및 나노바나나 2.1 고화질 이미지 생성.
5. **5단계 즉시 / 예약 게시 (`/posts`)**: 즉시 게시 및 Supabase Cron 기반의 예약 시간대 자동 발행 파이프라인.

### 장점 및 단점
- **장점**:
  - Meta Graph API 공식 가이드라인을 완벽히 준수하여 계정 차단(섀도우밴) 위험 없이 안정적인 공식 발행 지원.
  - Facebook 페이지 연동과 Instagram 로그인 연동 2가지 경로를 모두 지원하여 사용자 환경에 맞춤 대응.
  - 주제 발굴부터 이미지 생성, 예약 게시까지 원스톱으로 처리되어 일일 인스타 운영 공수 90% 이상 절감.
- **단점**:
  - 개인 인스타그램 계정은 Meta 정책상 API 자동 포스팅이 불가하며, 반드시 비즈니스/크리에이터 전문 계정으로 전환 필요.
  - 현재 숏폼 비디오(Reels) 자동 발행은 미지원(추후 확장 예정).

---

## 4. 현재 버전 및 버전별 변경 히스토리
- **현재 버전**: `v1.46` (2026-10-22)
- **v1.46 (2026-10-22)**: 그날 목록 썸네일 바로잡기 — 카드뉴스·AI 인플루언서·웹툰·네컷 게시 기록 표는 게시가 끝나면 저장소 이미지를 지우므로 썸네일을 만들지 않음(피드만 `cover_image_url`), 이미지가 안 열리면 썸네일 칸 숨김.
- **v1.45 (2026-10-22)**: 카드뉴스 홈(`/cardnews`)에 「📊 최근 7일 게시」(공용 `insta-week-posts`, 펼친 상태), 대시보드 그날 목록에 피드 썸네일.
- **v1.44 (2026-10-22, Claude Code 윈도우)**: 「📊 최근 7일 게시」 그래프에 피드·카드뉴스·AI 인플루언서·웹툰·네컷의 인스타 게시를 묶음별 색으로 함께 쌓고, 막대를 누르면 그날 게시한 글 목록(캡션 앞부분·인스타 게시물 바로가기). 게시 시각 칸 `insta_posts.published_at` 추가(운영 DB 적용, 기존 게시 3건은 그때의 `updated_at`으로 채움).
- **v1.43 (2026-10-22)**: 대시보드 「📊 최근 7일 게시」 그래프(공용 기준 코드 `week-reply-chart`).
- **v1.42 (2026-10-20)**: 프로그램 공지 띠.
- **v1.41 (2026-10-20, Claude Code 윈도우)**: 로그인 화면에서 크롬 자동 채우기가 입력칸을 연한 파랑으로 덮어쓰던 것을 다크로 고정(`globals.css` `.auth-dark input:-webkit-autofill`, 로그인 틀에만 적용).
- **v1.40 (2026-10-20, Claude Code 윈도우) — 로그인 화면 INSTA 다크 테마**: 주인님 지시 「로그인 창도 같은 테마로 맞춰」. `(auth)/layout.tsx`·`login`·`signup`의 공통 틀(밝은 격자 + 파란 `#005acc`)을 INSTA 토큰(바탕 `#0d0f17`·카드 `#161922`·보더 `#262c3d`·분홍~보라 그라디언트 버튼, 분홍 격자)으로. 화면 구성·문구·동작은 그대로.
- **v1.39 관리자 실검수(2026-10-20 크롬, 관리자 로그인)**: 카드뉴스 설정에서 「내 cron-job.org」 선택 → `insta_member_scheduler.mode = cronjob`(옛 `cns_member_scheduler`는 그대로) → INSTA 설정 화면에도 같은 선택 표시 → INSTA 설정에서 Vercel로 되돌림 → `mode = vercel`(시험 전 상태). 남은 예약 0건이라 cron-job.org 작업은 꺼진 채 유지(정상, 예약 생기면 켜짐 — 실제 켜짐은 예약 게시가 필요해 미시험).
- **v1.39 (2026-10-20, Claude Code 윈도우) — 예약 실행 방식 설정 하나로(피드 글 + 카드뉴스)**: 카드뉴스 API 5곳(`/api/cardnews/instagram/dispatch`·`dispatch-member`·`posts`, `/api/cardnews/scheduler`, `/api/settings/api-keys`)이 카드뉴스용 예약 설정(`cns_member_scheduler`) 대신 INSTA 설정(`@/lib/posts/memberScheduler` → `insta_member_scheduler`)을 씀. `schedulerConfig.ts` 「남은 예약」에 `cns_insta_posts`도 포함(0이면 cron-job.org 작업 끔), INSTA 회원 실행 주소 `/api/posts/dispatch-member`가 피드 글과 카드뉴스 예약을 함께 실행(옛 카드뉴스 회원 실행 주소도 INSTA 토큰으로 두 가지 모두 실행). 화면: INSTA 설정 「⏰ 예약 발행」·카드뉴스 설정에 「하나의 설정」 안내. 배포판(독립 모드)은 카드뉴스 표가 없어 기존과 같음. DB 표 변경 없음 — `cns_member_scheduler`는 지우지 않고 사용 안 함(관리자 1행, vercel 방식). `src/lib/cardnews/instagram/memberScheduler.ts`·`cronJobOrg.ts`·`schedulerConfig.ts`는 INSTA 화면에서 쓰지 않지만 공용 기준 코드(`member-scheduler`·`insta-cronjob-org`)의 기준 파일이라 남김.
- **v1.38 (2026-10-20, Claude Code 윈도우)**: 다크 바탕에 묻히던 화면 제목 6곳(게시글 관리·새 글·수정·상세·주제 수집·계정 선택 + 카드뉴스 기록 칸 제목)을 밝은 글자(`text-slate-100`)로. 라벨·흰 상자 등 화면 전체 색 정리는 `docs/IMPROVEMENTS.md` 2026-10-20 항목(디자인 담당).
- **v1.37 (2026-10-20, Claude Code 윈도우) — 병합 2단계: 보관함 하나로·카드뉴스 안내**: 「게시글 관리」(`/posts`) 아래에 「🎨 카드뉴스 예약·게시 기록」 칸(`src/components/cardnews/CardnewsPostsSection.tsx`, 카드뉴스 API `/api/cardnews/instagram/posts` 회원 본인 최근 30건·예약 취소 — 공용 `postsClient` 사용). 새 글 화면에서 「카드뉴스(캐러셀 4장)」를 고르면 「한글이 깨지지 않는 4~10장 카드뉴스는 카드뉴스 스튜디오에서」 안내(직접 첨부·AI 4장은 그대로 — 4컷 만화 넘기기 `postType=card_news` 호환). 배포판(독립 모드)은 둘 다 숨김. 남은 것: 예약 실행 방식 설정이 INSTA(`insta_member_scheduler`)·카드뉴스(`cns_member_scheduler`) 둘로 나뉨 — 통합은 표 이전이 필요해 3단계 이후 검토.
- **v1.36 (2026-10-20, Claude Code 윈도우) — 병합 1단계 화면 정리**: 크롬(시험 회원) 실검수에서 발견 → 카드뉴스 홈 제목이 「INSTA 포스팅 자동화」로 나오던 것을 「🎨 카드뉴스 스튜디오」로, 카드뉴스 설정 제목을 「카드뉴스 키·예약 실행 설정」으로(INSTA 「API키등록·플랫폼연동」과 구분), 카드뉴스 매뉴얼 제목의 옛 이름 정리. 좌측 메뉴 계정·로그아웃이 화면 맨 아래로 밀리던 문제(`md:justify-between`·휴대폰 펼침 메뉴 `justify-between`) 제거 — 마지막 메뉴 바로 아래로(사이드바 표준).
- **v1.35 (2026-10-20, Claude Code 윈도우) — 🎨 카드뉴스 스튜디오 병합 1단계(INSTA Cardnews 자동화 → INSTA 포스팅 안으로)**
  - 주인님 결정: 병합 A 방향 INSTA 안으로, **FREE 유지**, 최상위 규칙 그대로(회원 본인 인스타 연동 + 본인 Gemini·OpenAI·Claude 키, 폴백 없음). 분석 `../docs/analysis-insta-consolidation-20261020/REPORT.md`, 플랜 `docs/PLAN_20261020_CARDNEWS_MERGE.md`.
  - 화면 `/cardnews`(홈)·`/cardnews/plan|copy|design|background|export|guide|settings`, 좌측 메뉴 「카드뉴스 스튜디오」 묶음(독립 모드 배포판에서는 숨김 — 배포판 DB에 카드뉴스 표 없음). 작업 상태 보관 `(dashboard)/cardnews/layout.tsx`(ProjectProvider).
  - API는 **주소 그대로** `/api/cardnews/*`·`/api/projects*`·`/api/templates*`·`/api/settings/api-keys`(옛 주소 전달·회원 cron-job.org 작업 호환). DB 표 `cns_*` 그대로(이전 없음).
  - 코드 위치: 카드뉴스 전용 lib는 `src/lib/cardnews/`(ai·instagram·supabase·access·apiKeys·auth·programAccess·imageFileCheck·safeFetch), 컴포넌트 `src/components/cardnews/`. INSTA와 내용이 같던 공용 파일 4개(`instagram/publish.ts`·`ai/geminiImage.ts`·`ai/nanoBananaModels.ts`·`memberIntegrations.ts`)는 INSTA 것을 씀. 공용 기준 코드 등록부에 INSTA 사본 7개 추가(openai-request-params·insta-schedule-time·member-scheduler·insta-cronjob-org·insta-posts-client·safe-fetch·image-file-check), 기준 위치는 아직 `cardnews-studio`(3단계에 이동).
  - 권한: `src/lib/cardnews/access.ts` `THIS_PROGRAM_SLUG = "auto-instagram-posting"` — 카드뉴스 예약 실행도 INSTA 권한(FREE)으로 확인. 예약 자동 실행 `vercel.json`에 `/api/cardnews/instagram/dispatch` 5분 추가, 옛 카드뉴스 앱 v1.31은 자동 실행 제거. 회원 cron-job.org 실행 주소 `schedulerConfig.ts` → INSTA 도메인(기존 작업은 옛 주소로 계속 동작).
  - 연결 안내 문구·링크: 「INSTA 포스팅 자동화에서 연결」 → 「API키등록·플랫폼연동」(`/settings`, 같은 앱).
  - 테스트: 카드뉴스 테스트 5개 이식 `tests/cardnews/*`, `npm run test:cardnews`(52개 통과), `test:own-meta` 통과. 패키지: jszip·lucide-react·pretendard·@fontsource 3종·sharp·undici, 개발용 tsx. `next.config.mjs`에 sharp 설정.
  - 함께 나감(이전 「다음 배포 때 함께」): 2026-10-20 회원 예약 실행 방식 공용 사본 전환, 배포판 가입 확인 메일·독립 모드 판정 보강.
  - 남은 단계: 2단계(게시물 목록에 카드뉴스 예약 함께 표시, AI 이미지 카드뉴스 4장 → 스튜디오 일원화), 3단계(옛 cardnews-studio 주소 이동·카탈로그 「병합됨」·기준 위치 이동 — 주인님 확인 후).
- **v1.30 (2026-10-20, Claude Code 윈도우)**: **회원 연동 정보 공용 저장 ④단계** — 연결 계정을 공용 표 `member_platform_accounts`(platform `instagram`)에도 저장(이중 기록: Instagram 로그인 콜백 `callback/byok`, Facebook 방식은 페이지 확정 `confirmInstagramAccountAction`), 게시·예약 게시·화면 5곳은 `src/lib/instagram/memberAccount.ts` `getInstaAccountForUser` — 공용 계정(로그인 방식에 맞는 게시 권한·재연결 필요 아님·Facebook 방식은 페이지 ID 있음) → 없으면 `insta_accounts`. 해제는 공용 행도 삭제(설정 화면 안내 문구). 배포판(IS_STANDALONE)은 공용 표를 건드리지 않음. 공용 부품 사본 `src/lib/memberIntegrations.ts`(기준 루트 `lib/`). 카드뉴스·인플루언서는 아직 `insta_accounts`를 직접 읽으므로 이 표는 그대로 유지. 백필 `supabase/migrations/20261020150000_member_integrations_v1_30.sql`. 플랜 루트 `docs/PLAN_20261020_MEMBER_INTEGRATIONS_STEP4_INSTAGRAM.md`.
- **v1.28 (2026-10-20, Claude Code 윈도우)**: 직접 첨부 칸에서 **여러 파일을 한 번에 선택**(카드뉴스일 때 `multiple`, 파일 이름순·남은 장수만큼 차례로 업로드 — `handleAddUploadedSlides`), 새 글 주소 **`postType=card_news`** 로 카드뉴스 형식을 미리 고름(`posts/new/page.tsx` → `initialPostType`). 계기: 4컷 만화 v1.16 「카드뉴스(컷별 4장)로 올리기」. DB 구조 변경 없음(`supabase/migrations/20261020110000_multi_upload_v1_28.sql` = 버전만).
- **v1.27 (2026-10-20, Claude Code 윈도우)**: **AI 생성 없이 내 이미지·캡션으로 바로 저장.** 새 글 화면에서 이미지가 하나도 없을 때도 「이미지 파일 직접 첨부 (n/필요 장수)」 칸을 보여 주고(피드 1장·카드뉴스 4장까지 추가), 캡션과 필요한 장수의 이미지가 이미 있으면 「게시물 생성하기」가 주제·AI 키 확인과 AI 생성을 건너뛰고 그대로 임시저장/예약/즉시 게시한다(`readyWithoutAi`, 초록 안내 문구). 예전에는 이미지가 있어도 제출 때마다 AI로 캡션·이미지를 새로 만들어 덮어썼고, 직접 첨부 칸은 AI 이미지가 생긴 뒤에만 보였다. 계기: 4컷 만화 v1.15 「INSTA 자동포스팅으로 올리기」(주소 `?caption=&hashtags=`로 문구를 채우고 그림은 회원이 직접 첨부). 파일 `src/components/posts/PostForm.tsx`, DB 구조 변경 없음(`supabase/migrations/20261020100000_own_image_handoff_v1_27.sql` = 버전만). 플랜: `../four-cut-comics/docs/PLAN_20261020_INSTA_HANDOFF.md`(범위 변경 주인님 승인).
- **v1.26 (2026-10-19, Claude Code 윈도우 — agy 검증 이어받아 마무리)**: **날짜·예약 시각을 한국 시간으로 표시.** 서버 화면이 `toLocaleString("ko-KR")`를 시간대 없이 써서 Vercel(UTC) 기준으로 그려, 21:00 예약이 「오후 12:00」으로 보였다(저장값은 정상). 7곳(`dashboard`·`posts`·`posts/[id]`·`settings` 페이지, `CandidateList`)에 `timeZone: "Asia/Seoul"` 추가. DB 구조 변경 없음(`supabase/migrations/20261019250000_kst_display_v1_26.sql` = 버전만). 배포 `insta-auto-poster-1fcuzxisf`(Ready), DB `programs.version` v1.26.
  - **v1.25 크롬 실검수(관리자 계정 본인 키, 실제 인스타 게시 없음)**: 설정에서 「내 cron-job.org」 선택 → 공용 키 「등록됨」(Threads에서 넣은 키 재사용) → 초안을 10-20 21:00 예약(브라우저가 `2026-10-20T12:00:00.000Z`로 변환, 9시간 밀림 없음) → cron-job.org 작업 8678118 자동 생성·켜짐(`active:true`) → 보관함 상태 줄 「실행 중 · 대기 1건」 → 일시정지(`active:false, paused:true`)·재개 정상 → 예약 취소(임시저장) 후 **약 65초 뒤 작업 자동 꺼짐**(`active:false`) → Vercel로 되돌림(`mode:vercel`), 글 상태 시험 전과 같음(초안 5·게시 3).
  - agy(커밋 `af74be07`)의 「Edge 실세션 검수」는 서버 키로 로그인 링크를 만들어 세션을 넣은 화면 캡처 3장이었다(방식 전환·자동 켜기/끄기 미확인, 로그인 우회). 위 크롬 실검수로 대체한다.
- **v1.25 (2026-10-19, Claude Code 윈도우)**: 예약 발행 실행 방식 회원 선택(**운영 기본 Vercel / 배포판 기본 본인 cron-job.org**) + 중복 발행 방지·24시간 규칙. 지침 루트 `docs/SCHEDULER_POLICY.md`, 플랜 `docs/PLAN_20261019_MEMBER_SCHEDULER.md`, 기준 구현 `threads-affiliate-poster` v1.63·`threads` v1.19.
  - 화면: 설정 「⏰ 예약 발행」(다크 테마 `components/settings/SchedulerModePicker.tsx` + cron-job.org 키 칸, 공용 provider `cronjob_org_api_key` — 다른 프로그램에서 넣은 키면 「등록됨」), 게시글 관리 위 상태 줄·전체 일시정지/재개(`components/posts/SchedulePublishingControl.tsx`), `/guide` 예약 FAQ(운영·배포판 각각), 예약 시각 안내 문구.
  - 코드: `src/lib/posts/cronJobOrg.ts`(작업 이름: 운영 「AIMaster INSTA…」, 배포판 「INSTA 포스팅 예약 발행(1분)」)·`memberScheduler.ts`(표 `insta_member_scheduler`, 토큰 `ins_…` DB엔 해시, 환경변수 `INSTA_PLATFORM_SCHEDULER` — 운영 off면 끔, 배포판 on일 때만 켬), `src/lib/actions/scheduler.ts`, `actions/posts.ts` 예약 전 확인·**슬라이드 저장 뒤** 작업 켜기(실패 시 초안), `actions/settings.ts` 키 변경·삭제 처리, 새 주소 `/api/posts/dispatch-member`(즉시 응답 + `after`), `/api/posts/dispatch-scheduled`는 vercel·비일시정지 회원만 + `dynamic`·`fetchCache` 선언 추가(빠져 있었음).
  - `dispatch.ts`: `insta_posts` 조건부 `scheduled → publishing`(중복 방지), 24시간 넘게 지난 예약 실패 처리, 회원 실행은 운영에서만 핸드폰 정책.
  - DB(운영 `esgxyikcnnvmlhygjkth`): `supabase/migrations/20261019240000_insta_member_scheduler.sql`(표 + RLS + `programs.version` v1.25) — **표가 없으면 운영자 예약 실행이 멈추므로 DB 적용 후 배포.** → 2026-10-19 주인님 승인 후 크롬 SQL Editor(AIMaster·PRODUCTION 확인)로 적용, 결과 `insta_member_scheduler`·`v1.25` 확인. 배포 `insta-auto-poster-46r0me9fo`(Ready), 실행 주소 무인증·가짜 토큰 401, `/login` 200. 새 배포의 첫 운영자 예약 실행 14:15:12(UTC) 200.
  - 배포판(`KIT/`): `schema.sql`에 표·`cronjob_org_api_key` 허용 추가(`kit.json` `checkTable` → `insta_member_scheduler`), `upgrade-20261019-cronjob.sql`(기존 설치자), `enable-vercel-cron.ps1/.sh`(Pro — `vercel.json` 없으면 새로 만듦), `README.md` 6장(예전 「cron-job.org에 CRON_SECRET 직접 넣기」 → 「설정에 키만 등록」, 기존 설치자 전환 안내)·자주 막히는 곳, `PLATFORMS.md`, `env.example`.
  - 함께 나감: 2026-10-18 예약 안내 문구, 2026-10-19 게시 코드 공용 기준 분리(`instagram/publish.ts`, 동작 동일), 강의용 독립 운영 모드 코드. 검수: tsc 0, `test:own-meta` 통과, `npm run build`. 크롬 실화면 검수는 B 묶음 끝난 뒤 한꺼번에.
- **v1.24 (2026-10-18, Claude Code 윈도우)**: 운영 예약 게시 실행 연결 — `vercel.json` 새로 만들어 Vercel 자동 실행이 `/api/posts/dispatch-scheduled`를 5분마다 호출(`CRON_SECRET`은 기존 등록값 사용, 환경변수 변경 없음). 그전에는 실행 장치가 없어 예약 글이 나가지 않았음. 같은 배포에 강의용 독립 운영 모드 코드(커밋 `956d1156`, 운영에는 영향 없음)도 함께 반영. 검수: Vercel cron 목록 등록 확인, 01:30:12 첫 자동 실행 GET 200, 비밀값 없는 호출 401. 실행 기록 조회는 `npx vercel logs requests --since 20m --json`(일반 `vercel logs`는 함수 출력만 보여 요청이 안 잡힘).
- **v1.23 (2026-10-18, Antigravity CLI)**:
  - **플로우 위저드 스타일 (인스타 바이럴 변형)** 다크 테마 전면 적용 (`globals.css`, `layout.tsx`, `Sidebar.tsx`, `dashboard`, `settings`, `ui`).
  - 375px 모바일 전용 상단 고정 헤더(`h-14`) 및 슬라이드 오버레이 드로어 메뉴 구축 완료.
  - **비주얼 연동 & 사용 매뉴얼 (`/guide`) 전면 고도화** (마스코트 배너, 5단계 파이프라인, Meta 앱 2대 연동 방식 비교 카드, 인스타 바이럴 팁, FAQ 6종).
  - Microsoft Edge 포그라운드 실세션 검수 완료 (데스크톱/모바일 5종 캡처 보존).
- **v1.22 (2026-10-18)**: 이미지 시간 초과 안내를 Google AI Studio 사용량 확인으로 정정.
- **v1.21 (2026-10-18)**: 이미지 시간 초과 자동 재시도 중단 (이중 과금 방지).
- **v1.20 (2026-10-17)**: 이미지 생성 시간 초과 안내 문구 통일.
- **v1.19 (2026-10-17)**: 공용 이미지 기준 코드 갱신 반영.
- **v1.18 (2026-10-17)**: 공용 이미지 어댑터(`geminiImage.ts`) 연동.
- **v1.15 (2026-10-17)**: 기본 연동 & 사용 매뉴얼 추가.
- **v1.14 (2026-10-17)**: 등록 주소 한눈에 보기 카드 및 복사 버튼 탑재.
- **v1.13 (2026-10-17)**: 연결 버튼 색 구분 (Facebook 파란색 / Instagram 초록색).
- **v1.11 (2026-10-16)**: Facebook 페이지 방식 전용 앱 ID 칸 분리.
- **v1.08 (2026-10-16)**: SSO 새 도메인 `https://auto-instagram-posting.buylife.xyz` 이전.

---

## 5. 남아 있는 추가 프로그램 및 디자인 작업 대기 내용
- 상세 내역은 [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) 참조:
  1. `INSTA-01`: Instagram 릴스(Reels) 영상 자동 포스팅 지원
  2. `INSTA-02`: 인스타그램 9분할 피드 그리드 시뮬레이터 뷰
  3. ~~`INSTA-03`: INSTA Cardnews 자동화(`cardnews-studio`) 1클릭 캐러셀 전송 파이프라인~~ → 해결(카드뉴스 스튜디오가 인스타에 직접 즉시·예약 게시, 2026-10-20 확인)
  4. `INSTA-04`: 팔로워 활동 기반 최적 발행 시간대 AI 추천

---

## 6. 기존 다른 프로그램과의 연계 / 기능 병합 제안
1. **`cardnews-studio` (INSTA Cardnews 자동화) 연계**:
   - 카드뉴스 스튜디오에서 캔버스로 글자를 얹어 완성한 고해상도 카드뉴스 슬라이드(4~10장)를 본 프로그램으로 원클릭 전송하여 즉시 인스타 캐러셀 예약 포스팅으로 등록하는 파이프라인 구축.
2. **`threads-posting` (Threads 포스팅 자동화) 연계**:
   - 동일한 Meta 생태계 내에서 인스타그램 피드 게시물과 Threads 피드 타래글을 한 번에 동시 발행하는 멀티 퍼블리싱 옵션 연동.

---

## 7. 사용자 편의성 증대를 위한 디자인 UI개선안과 레이아웃 제안
1. **피드 그리드 프리뷰 룸**: 내 실제 인스타그램 프로필 9분할 그리드에 새로운 게시물이 어떻게 어우러지는지 미리 맞춰볼 수 있는 플래너 룸 추가.
2. **캡션 2,200자 및 해시태그 30개 실시간 카운터 위젯**: 작성 중 플랫폼 제약조건을 시각적으로 안내하는 실시간 게이지 제공.

---

## 8. 관련 문서 링크
- [디자인 개발 플랜](docs/PLAN_20261017_DESIGN_RENEWAL.md)
- [디자인 핸드오프](docs/DESIGN_HANDOFF.md)
- [개선 및 특이사항](docs/IMPROVEMENTS.md)
- [개선 백로그](docs/IMPROVEMENT_BACKLOG.md)

## 2026-10-18 — `test:own-meta` 실패 해결: 함수 모양 검사를 추가 인자 허용으로 (Claude Code 윈도우, 시험 파일만 변경·버전·배포 없음)
- 증상: `npm run test:own-meta`가 `getFacebookAuthorizeUrl(state: string, appId: string)` 글자 그대로 찾다 실패.
- 원인: 2026-10-16 옛 vercel.app 주소 정리 대비(두 콜백 주소 지원)로 `getFacebookAuthorizeUrl`·`exchangeFacebookCode`에 `redirectUri` 인자가 추가됐는데 시험은 옛 모양을 검사. 실제 코드는 정상(회원 본인 앱 ID·시크릿 사용 그대로).
- 해결: `scripts/test-own-meta-app.cjs`가 본인 앱 ID·시크릿 인자는 그대로 확인하고 그 뒤 추가 인자는 허용 → `own meta app ok`. Antigravity의 v1.23 작업 종료(커밋 `f5fdf6da`) 확인 후 진행.

## 2026-10-18 — 강의용 독립 설치 키트(독립 운영 모드·KIT/·설치 스크립트) (Claude Code 윈도우, 버전·배포 없음)

- **배경**: 주인님 강의(2026-10-18)에서 수강생이 이 프로그램을 **본인 계정(Supabase·Vercel·Meta)에 독립 설치**해 실제 포스팅까지 쓰도록 하기 위한 설치 키트. AIMaster와 연결 없음, 화면 이름은 수강생 이름/브랜드.
- **독립 운영 모드**: 환경변수 `NEXT_PUBLIC_STANDALONE_MODE=true`일 때만 동작(패턴 출처 threads-affiliate-poster `deployment.ts`). 운영 사이트(AIMaster)는 이 변수가 없어 **동작 변화 없음** — 그래서 이번에는 배포·버전 변경 없이 커밋만 하고, 다음 배포 때 함께 나간다(2026-10-17 비용 절감 규칙). **다음 배포자는 버전 +0.01 하고 이 항목을 버전 기록에 넣을 것.**
  - `src/lib/deployment.ts`(새 파일): `IS_STANDALONE`·`SITE_URL`·`BRAND_NAME`·`brandTitle()`
  - 독립 모드에서: 권한 판정은 로그인만 확인(구독·등급·핸드폰 없음), 자체 로그인·회원가입 화면, OAuth 콜백 주소는 `NEXT_PUBLIC_SITE_URL` 기준, buylife.xyz로 보내는 리디렉션·"다른 프로그램 보기" 링크·AIMaster 매뉴얼 버튼·약관 링크 숨김, 화면 제목·좌측 메뉴에 `NEXT_PUBLIC_BRAND_NAME` 표시.
- **키트 파일(`KIT/`)**: `README.md`(설치 안내 0~9단계) · `PLATFORMS.md`(플랫폼별 가입·키 발급) · `schema.sql`(운영 DB 카탈로그에서 구조만 뽑아 만든 새 DB용 전체 구조 — PGlite로 두 번 실행해 재실행 안전 확인, 테이블 12·정책 32·`insta-post-images` 버킷) · `setup.ps1`/`setup.sh`(윈도우/맥 대화형 설치: npm install → `.env.local` 생성(CRON_SECRET 자동) → 빌드 → Vercel 로그인·연결·환경변수 등록·배포) · `env.example` · `kit.json`
- **묶음 만들기**: 루트 `python scripts/make_lecture_kit.py` → `D:\PDS\SNS_Auto_Posting_Kit_YYYYMMDD.zip`(두 프로그램 + `00_START_HERE.md`, `.env*`·`node_modules`·`.next`·`.vercel`·내부 문서·`supabase/`·`scripts/` 제외). 소스·KIT를 고치면 이 스크립트를 다시 돌린다.
- **예약 게시**: Vercel 무료 플랜은 하루 1번 cron만 허용 → 수강생은 cron-job.org로 `/api/posts/dispatch-scheduled`(5분)를 `Authorization: Bearer CRON_SECRET` 헤더와 함께 호출.
- **검수**: `tsc` 통과, 기존 시험 `test:own-meta` 통과, 압축을 새 폴더에 풀어 독립 모드 가짜 설정으로 `npm install`·`npm run build` 통과(단, 윈도우에서 폴더 경로가 아주 길면 Turbopack `file is too long`으로 빌드 실패 — 짧은 경로 `D:\kt`에서는 통과, KIT/README 문제 해결 표에 안내 추가). **실제 Meta 계정 연결·게시는 시험하지 않음**(수강생 계정 없음) — 강의 때 첫 수강생 설치에서 확인 필요.

- **바뀐 파일**: `src/lib/deployment.ts`(새) · `src/lib/oauthRedirect.ts` · `src/proxy.ts`·두 Instagram 콜백(독립 모드에서 buylife 리디렉션 안 함) · `src/lib/access.ts` · `src/lib/actions/auth.ts`(`signUpAction`) · `(auth)/login`·`signup`·`layout` · `settings/page.tsx`·`guide/page.tsx` · `Sidebar.tsx` · `app/layout.tsx` · `src/lib/posts/dispatch.ts`(독립 모드는 핸드폰 조건 건너뜀 — 없으면 수강생 사이트 예약 글이 영원히 안 나감)
- **발견(미처리)**: 운영 사이트에는 `dispatch-scheduled`를 부르는 Vercel cron이 없음 → DB `cron.job`에도 없음 → 운영 예약 게시가 실행되지 않음(밀린 글 0건, `docs/IMPROVEMENTS.md` 2026-10-18 항목, 주인님 확인 필요).

## 2026-10-18 — 예약 화면 안내 문구 「예약 시각 후 5분 안에 자동으로 발행됩니다」 (Claude Code 윈도우, **미배포 — 다음 배포 때 함께**)
- `src/components/posts/PostForm.tsx` 예약 시각 입력란에 안내 추가. 정확히 그 분에 안 올라가도 회원이 헷갈리지 않게(예약 게시 누락 방지 ②, 플랜 `docs/PLAN_20261018_SCHEDULED_DISPATCH_MONITOR.md`).
- 급하지 않은 화면 문구라 비용 규칙에 따라 커밋만 함. **다음에 이 프로그램을 배포하는 CLI는 버전 +0.01(코드·DB)하고 버전 기록에 이 항목을 넣을 것.** 검수: tsc 0.

## 2026-10-19 — 게시 코드를 공용 기준 코드 `instagram-publish`로 분리 (Claude Code 윈도우, **미배포 — 다음 배포 때 함께**)
- `src/lib/instagram/publish.ts`(새 파일, **공용 기준**): `client.ts`에 있던 게시 함수(`graphBaseFor`·`publishInstagramPost`·`publishInstagramCarousel`과 내부 컨테이너·대기·재시도)를 동작 그대로 옮김. `client.ts`는 이 파일에서 다시 내보내 기존 import는 그대로 동작. 사본: `cardnews-studio/src/lib/instagram/publish.ts`(v1.18 인스타 바로 게시). 고칠 때는 이 파일만 고치고 `node scripts/check-shared-modules.mjs --sync`.
- 이 프로그램의 `insta_accounts`(회원별 인스타 연결값)는 루트 최상위 지침 「회원 연동 정보 공용 저장·재사용 규칙」에 따라 카드뉴스·인플루언서·웹툰이 새로 등록하지 않고 가져다 씀 — 테이블 구조를 바꿀 때는 그 프로그램들도 함께 확인.
- 검수: tsc 0, `npm run test:own-meta` 통과. 동작 변화 없어 배포·버전 변경 없이 커밋만 — **다음 배포자는 버전 +0.01하고 이 항목을 버전 기록에 넣을 것.**

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 4개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-19 — 배포 키트 공용화 (Claude Code 윈도우, 코드·배포 변경 없음)
- `KIT/kit.json`에 포장 설정(예전 `scripts/make_lecture_kit.py` 안에 있던 뺄 항목·덮어쓸 파일)을 옮김, `KIT/setup.*`는 공용 템플릿(`AIMaster/scripts/kit-template/`)으로 교체(키 숨김 입력·GitHub 자동 연결 해제). 예약 방식 지침(`docs/SCHEDULER_POLICY.md`)은 아직 미적용(1순위 예정). 지침: 루트 `docs/DISTRIBUTION_KIT_GUIDE.md`.

## 2026-10-20 v1.27 배포·검수 (Claude Code 윈도우)
- 배포 `insta-auto-poster-qb6d42edv` Ready, DB `programs.version` v1.27(slug `auto-instagram-posting`). 크롬(관리자 계정): 4컷 넘기기 주소로 새 글 화면 → 이미지 없을 때 「이미지 파일 직접 첨부 (0/1장…)」 표시 → 시험 그림(400px 단색 PNG) 첨부 → 「AI 생성 없이 그대로 저장」 안내 → 주제 비운 채 [게시물 생성하기](임시저장) → AI 호출 없이 초안 저장(`/posts/794aff2a-…`, 캡션·해시태그·그림 유지). 인스타 게시는 하지 않음. **시험 초안 1건이 관리자 계정에 남아 있음**(제목 「월요일 아침 & 알람 다섯 번 (넘기기 시험)」 — 필요 없으면 게시글 관리에서 삭제). 카드뉴스(4장) 직접 첨부 경로는 미검수.
- v1.28 배포·검수(2026-10-20): `insta-auto-poster-lxpjm2zhb` Ready, DB v1.28. 크롬(관리자 계정): `?postType=card_news&caption=&hashtags=` → 카드뉴스 형식 선택됨·첨부 칸 「0/4장 · 여러 장 한 번에」(`multiple`) → 시험 그림 4장을 4·2·3·1 순서로 한 번에 선택 → 이름순 1·2·3·4로 정렬돼 올라감 → AI 없이 임시저장(`/posts/dce21ba1-…`, 캐러셀 4장 순서 유지). 인스타 게시 없음. **시험 초안 2건이 관리자 계정에 남음**(「…(넘기기 시험)」 피드, 「카드뉴스 넘기기 시험」).

## 2026-10-20 v1.29 — 예약 공용 코드 「실패 시 상태 되돌리기」 (Claude Code 윈도우)
- 주인님 「순서대로 진행해줘」(남은 일 4번). 「내 cron-job.org」로 바꿀 때 cron-job.org 작업 켜기가 실패하면(하루 호출 한도 초과·키 오류) **이전 방식으로 되돌림**(예전엔 cronjob으로 남아 운영자 실행에서도 빠져 예약이 멈출 수 있었음), 「재개」가 실패하면 **일시정지 상태로 되돌림**(예전엔 화면은 일시정지·DB는 대기로 어긋남). `memberScheduler.ts`의 `setMemberSchedulerMode`·`resumeMemberScheduler` 두 곳, 11개 사본 같은 수정. 커밋 `ccf80d68`, DB 버전 크롬 SQL Editor로 갱신, 11개 순차 배포 모두 Ready·`/login` 정상·회원 실행 주소 가짜 토큰 401. 이 프로그램 배포 `insta-auto-poster-cyvr87qf1`.
- 실검수는 같은 코드인 booking-reminder에서 실패 경로 3가지를 실제로 확인(cron-job.org 하루 한도 소진 상태 이용).

## 2026-10-20 v1.31 — 일시정지 안전 처리·상태 줄 즉시 갱신 (Claude Code 윈도우)
- 예약 공용 코드 보강(주인님 「추가 개선 제안도 진행해줘」): ① `pauseMemberScheduler`가 **일시정지를 먼저 저장**하고 cron-job.org 끄기는 시도만 — 실패하면(하루 한도 등) 오류 대신 「일시정지했습니다. 작업 끄기는 다음 호출 때 다시 시도합니다」 안내(`pauseScheduledPublishing`의 `notice`). 대신 회원 실행 주소가 새 `skipPausedMember`로 **일시정지된 회원이면 실행하지 않고** 작업 끄기를 다시 시도(예전엔 회원 실행 주소가 일시정지를 확인하지 않아, 「먼저 저장」만 바꾸면 발송이 나갈 수 있었음). ② `SchedulePublishingControl`이 서버 값이 바뀌면 실행 상태도 따라 바꿈(`useEffect`) — 예전엔 규칙·예약을 켜서 작업이 켜져도 새로고침 전까지 「대기」로 남음. 커밋 `c380e793`, DB 버전 크롬 SQL Editor, 6개 순차 배포 Ready·`/login` 200·회원 실행 주소 가짜 토큰 401. 이 프로그램 배포 `insta-auto-poster-lkzejhqj4`.
- 미확인: 일시정지 실패 경로·상태 줄 즉시 갱신의 크롬 실검수 — 본인 cron-job.org 키가 있는 관리자 로그인이 필요(검수 시점 크롬이 시험 회원으로 로그인돼 있었음). 다음 첫 단계: 관리자로 「내 cron-job.org」 → 규칙/예약 켜기 직후 상태 줄이 새로고침 없이 「실행 중」이 되는지 확인 → Vercel 복귀.

## 2026-10-20 v1.33 — 방식이 다른 회원 토큰 호출 시 cron-job.org 작업 끄기 (Claude Code 윈도우)
- 회원 토큰 확인(`memberIdForToken`)에서 토큰은 맞지만 실행 방식이 「내 cron-job.org」가 아니면 지금처럼 401을 돌려주되 **cron-job.org 작업을 끄고 `active: false`로 정리**(재개·방식 변경이 겹쳐 작업이 켜진 채 남으면 5분마다 401 헛호출이 이어지던 문제). 직전 배포(c69b0407)의 `skipPausedMember` 방식 조건은 토큰 확인이 먼저 401로 걸러 닿지 않는 코드였으므로 일시정지만 보는 원래 조건으로 되돌림. 커밋 `be5c5107`, DB 버전 크롬 SQL Editor, 15개 순차 배포 Ready·가짜 토큰 401.
- 재현 검수(상품소싱, 관리자): 작업을 켠 뒤 DB 방식만 Vercel로 → 11:00 회원 실행 401 + 작업 꺼짐(`active: false`) → 11:05~11:34 호출 없음. 시험 전 상태로 복귀.

## 2026-10-20 (버전 변경 없음·미배포) — 회원 예약 실행 방식 코드를 공용 기준 코드 `member-scheduler` 사본으로 (Claude Code 윈도우)
- 한 일: `src/lib/posts/memberScheduler.ts`를 **공용 기준 코드 `member-scheduler`의 사본**으로 바꿨다(기준 `cardnews-studio/src/lib/instagram/memberScheduler.ts`, 인스타 4개 + 예약 프로그램 11개 = 15개). 이 프로그램만의 값(사이트 주소·실행 방식 표·토큰 앞글자·관리자 끄기 환경변수·설치 키트 여부·「남은 일」 세기·실행 주소)은 같은 폴더에 새로 만든 `schedulerConfig.ts`로 옮겼다(원래 파일 값과 자동 대조 일치). **앞으로 `memberScheduler.ts`는 직접 고치지 말고** 기준만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.
- 동작 변경 없음(관리자가 Vercel 방식을 끈 경우의 오류 문구만 운영/키트로 나뉨). DB 변경 없음. 플랜 `cardnews-studio/docs/PLAN_20261020_MEMBER_SCHEDULER_SHARED.md`.
- 검수: tsc·build 통과(테스트가 있는 프로그램은 테스트도), 공용 코드 점검 일치, 설치 키트 DB 대조 통과.
- **미배포**(내부 정리): 다음 배포 때 함께, 버전 +0.01도 그때. 그 배포 때 예약 상태 화면과 회원 실행 주소 가짜 토큰 401을 확인.

## 2026-10-20 — 배포판(독립 모드) 가입 확인 메일·독립 모드 판정 보강 (Claude Code 윈도우, **운영 미배포 — 다음 배포 때 함께**)
- 증상(주인님 수강생 계정 설치 시험): ① 회원가입을 누르면 buylife.xyz로 감 ② Confirm email이 켜진 상태에서 가입 확인 메일 링크가 localhost로 감.
- 원인: ① 윈도우 마법사가 Vercel에 `NEXT_PUBLIC_STANDALONE_MODE="﻿true"`(BOM)를 넣어 `IS_STANDALONE`이 false → 비독립 분기(AIMaster 가입 안내·buylife 로그인). 마법사는 v1.06에서 수정 ② `signUp`에 `emailRedirectTo`가 없고 메일 링크를 받을 경로도 없어 Supabase 기본 Site URL(localhost)로 감.
- 수정: `deployment.ts` `IS_STANDALONE`을 `(… ?? "").trim() === "true"`(BOM·공백 제거, 운영은 변수 없음 → 동작 같음), 가입 시 `emailRedirectTo`=내 사이트 확인 경로, 새 경로 `/api/auth/confirm`(`src/app/api/auth/confirm/route.ts`)(독립 모드 전용, `code`·`token_hash` 처리, 실패하면 `/login?confirmed=1` 「메일 인증이 끝났습니다」 안내), `KIT/kit.json` `authRedirectPath` → 마법사 마무리에서 Supabase URL Configuration(Site URL·Redirect URLs `내주소/**`) 안내.
- 검수: tsc 0, `test:own-meta` 통과. 운영에서는 `IS_STANDALONE` false라 새 경로·옵션이 동작하지 않음 → 급하지 않은 변경, **다음 배포자는 버전 +0.01하고 이 항목을 버전 기록에 넣을 것**. 배포판 `SNS_Auto_Posting_Kit_v1.07`부터 포함.

## 2026-10-20 v1.42 — 프로그램 공지 띠 추가 (Claude Code 윈도우)
- 공용 기준 코드 `program-notice-banner`(기준 `ai-webtoon-studio/src/components/ProgramNoticeBanner.tsx`) 사본을 받아 대시보드 레이아웃 `<main>` 맨 위에 표시. 메인 사이트 공지의 「관련 프로그램」에 이 프로그램이 있으면 최근 공지 1건(30일 이내), 「닫기」는 브라우저에 기억. 사본은 직접 고치지 않고 기준 수정 후 `node scripts/check-shared-modules.mjs --sync`.

## 2026-10-22 v1.43 — 대시보드에 「📊 최근 7일 게시」 그래프 (Claude Code 윈도우)
- 상태 카운터 아래에 공용 기준 코드 `week-reply-chart` 사본(`src/components/weekChart/WeekReplyChart.tsx`·`src/lib/weekChart/bucket.ts`, 기준 comment-inbox — 직접 고치지 말 것). 대시보드가 이미 읽는 본인 `insta_posts` 중 status=published 글을 한국 시간 날짜별로 셈(추가 조회 없음).
- **한계**: 게시 시각 전용 칸이 없어 `updated_at`(수정 때 트리거로 자동 갱신)을 게시 시각으로 씀 → 게시 뒤 그 글을 다시 수정하면 수정한 날로 옮겨 셈. 정확히 하려면 `published_at` 칸 추가(DB 구조 변경, 사전 승인 필요). 카드뉴스(`cardnews`)의 게시는 다른 표라 아직 세지 않음.
- 검수: tsc·build(종료 코드 0), 커밋 `10835a02`, 배포 `insta-auto-poster-gk2g71uq4` READY, DB(`auto-instagram-posting`) v1.43, 크롬에서 v1.43·그래프·「아직 게시 기록이 없어요」, 400px 넘침 없음. 비용: Vercel 빌드 1회.

## 2026-10-22 v1.44 — 게시 시각 칸 · 막대 누르면 그날 게시한 글 · 인스타 게시 전체 쌓기 (Claude Code 윈도우)
- **DB(주인님 승인, 운영 `esgxyikcnnvmlhygjkth`)**: `insta_posts.published_at timestamptz` 추가. 기존 게시 3건은 그때의 `updated_at`으로 채움 — 채우는 동안 `insta_posts_set_updated_at` 트리거를 잠깐 꺼 `updated_at`은 그대로(검증: 게시 3 = 채움 3 = 「게시 시각 = 수정 시각」 3). 크롬 SQL 편집기에서 한 트랜잭션으로 실행, 기록 `supabase/migrations/20261022100000_insta_posts_published_at.sql`. 형식 정의 `src/types/database.types.ts`에 칸 추가.
- 게시 완료 때 기록: `src/lib/posts/publish-core.ts` `published_at: new Date().toISOString()`.
- 그래프: `src/lib/instaWeek.ts`(새 파일) — 피드 `insta_posts`·카드뉴스 `cns_insta_posts`·AI 인플루언서 `aif_insta_posts`·웹툰 `wts_insta_posts`·네컷 `fcc_insta_posts`(모두 같은 공용 DB, 회원 본인 읽기 RLS + user_id 필터)에서 게시 완료·`published_at` 최근 7일을 묶음별 색으로 셈(`loadInstaWeek`), 막대 누르면 그날 목록(`loadInstaDay`, 묶음마다 최근 50건, 캡션 앞 80자, 인스타 게시물 주소). 배포판(독립 모드)은 다른 표가 없어 피드만. 다른 프로그램 표는 이 프로그램 형식 정의에 없어 조회만 형식 검사 밖(`Loose`).
- 화면: 공용 기준 코드 `week-reply-panel` 사본 `src/components/weekChart/WeekReplyPanel.tsx` + 서버 동작 `src/lib/actions/weekPosts.ts` `loadWeekDayPostsAction`(이용 권한 확인 → 7일 안 날짜만). 문구는 `labels`로 「게시한 글 목록」.
- 검수: tsc·build(종료 코드 0)·`test:own-meta` 통과. 커밋 `622694bc`(칸)·`b0a779f0`(그날 목록)·`173db0d8`(쌓기·버전), 배포 `insta-auto-poster-e5n2o8g7g` READY, DB v1.44, 크롬(관리자)에서 v1.44·막대 7개·누르면 「이날 게시한 글이 없어요」 오류 없음·400px 넘침 없음. 다섯 표 모두 같은 칸으로 조회 200 확인(서비스 키 읽기). **관리자 계정 최근 7일 게시가 0건이라 쌓인 막대·목록 항목 모양은 실제 데이터로 미확인.** 비용: Vercel 빌드 1회.
- 미배포(다음 배포 때 함께): 그래프 막대의 숨겨진 설명 문구를 「그날 목록 보기」로(커밋 `6c2d922d`).
- 같은 날 보완(커밋 `21280e5f`, **미배포 — 운영은 칸이 있어 동작 같음, 다음 배포 때 함께**): 게시 완료 저장에서 `published_at` 칸이 없다는 오류면 칸을 빼고 다시 저장(키트 DB 대비), `KIT/schema.sql`에 칸 추가, 기존 설치자용 `KIT/upgrade-20261022-published-at.sql`·README 파일 표. **배포판 압축(`scripts/make_lecture_kit.py`)은 아직 다시 만들지 않음.**

## 2026-10-22 v1.45~v1.46 — 카드뉴스 홈 7일 게시 그래프 · 그날 목록 썸네일 (Claude Code 윈도우)
- 새 공용 기준 코드 `insta-week-posts`(기준 이 프로그램 `src/components/weekChart/InstaWeekPosts.tsx`, 사본 AI 인플루언서·웹툰): 이미 있는 본인 게시 기록 API(최근 30건)를 화면에서 불러 「📊 최근 7일 게시」 그래프 + 막대 누르면 그날 게시한 글(캡션 앞부분·인스타 바로가기). 새 서버 기능 없음. 접힌 한 줄(`defaultOpen` false) 또는 펼친 상태.
- 카드뉴스 홈: 환영 카드 아래 펼친 상태로. 카드뉴스 기록 API(`/api/cardnews/instagram/posts`)가 `caption`도 돌려줌.
- 썸네일: 공용 `bucket.ts` `publicImageUrl`(전체 주소면 그대로·쉼표 여러 주소면 첫 번째·저장소 경로면 공개 주소), 공용 그날 목록이 48px 썸네일을 그리고 안 열리면 숨김. **카드뉴스·AI 인플루언서·웹툰·네컷 표는 게시 완료 직후 `removeImages`로 저장소 이미지를 지워서 썸네일 없음**(v1.45에서 만들었다가 v1.46에서 뺌 — 실제 행의 경로가 「Object not found」로 확인됨). 피드 `cover_image_url`은 남아 있어 표시(실제 주소 200 확인).
- 검수: tsc·build, 커밋 `4ae8a4b9`·`3e7ecf43`·`bf0b8479`, 배포 `insta-auto-poster-30vwcuvn6`(v1.45) → `insta-auto-poster-3vl1ebapw`(v1.46) READY, DB v1.46, 크롬에서 카드뉴스 홈 그래프·막대 누르기·400px, 대시보드 v1.46 그날 목록 오류 없음. 최근 7일 게시 0건이라 썸네일은 화면에서 미확인. 비용: Vercel 빌드 2회.
