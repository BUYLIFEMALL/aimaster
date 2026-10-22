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
- **현재 버전**: `v1.58` (2026-10-22)
- **v1.58 (2026-10-22)**: 리메이크 문구 장별 겹침 테두리 · 받아쓰기 → AI 쇼츠 원스톱 — 아래 v1.58 절.
- **v1.57 (2026-10-22)**: 떡상 리메이크 문구 베끼기 방지(공용 `reference-copy-guard`) — 아래 v1.57 절.
- **v1.56 (2026-10-22)**: 받아쓰기 후킹·본문·마무리 나누기, 분석 재료 배지 — 아래 v1.56 절.
- **v1.55 (2026-10-22)**: OpenAI·Claude 엔진에서도 수집한 릴스 「🎙 말소리까지 분석」(회원 본인 OpenAI 받아쓰기) — 아래 v1.55 절.
- **v1.54 (2026-10-22)**: 수집한 릴스 「🎬 영상까지 분석」(Gemini 파일, 분석 뒤 삭제)·유형 필터 — 아래 v1.54 절.
- **v1.53 (2026-10-22)**: AI 상세페이지 자동화 섹션 이미지 받기(`from=shop-detail&shopImage=`) — 아래 v1.53 절.
- **v1.52 (2026-10-22)**: 상위 3개 묶어 분석, 경쟁 계정 즐겨찾기(공용 표 `member_watch_accounts`) — 아래 v1.52 절.
- **v1.51 (2026-10-22)**: 해시태그 수집을 Apify 전용 수집기로, 오류 항목 안내 — 아래 v1.51 절.
- **v1.50 (2026-10-22)**: 🔍 인기 게시물 자동 수집(Facebook 페이지 방식은 공식 API, 그 밖·해시태그는 회원 Apify 토큰), 릴스 소리 최대 3분, 장면 시점 — 아래 v1.50 절.
- **v1.49 (2026-10-22)**: 떡상 리메이크에 릴스 영상 파일 올리기(브라우저에서 장면 4장·소리만 뽑아 분석, Gemini는 말까지) — 아래 2026-10-22 v1.49 절.
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

## 2026-10-22 ✅ 배포됨(v1.48, 2026-10-22) — 7일 그래프 글자 크게 (주인님 지시: 「놔뒀다가 다음에 수정할때 그때 같이 빌드」)
- 무엇: 공용 그래프 사본 `src/components/weekChart/WeekReplyChart.tsx`·`WeekReplyPanel.tsx` 글자 한 단계씩 크게(제목 14→16px, 합계 12→14px, 막대 위 건수 11→14px, 날짜·요일 10→12px, 흐린 글자 투명도 60→80%, 그날 목록도 한 단계씩). 커밋 `9479f0bc`로 저장소에는 이미 반영됨.
- **이 프로그램 단독 배포는 하지 않는다.** 다음에 이 프로그램을 다른 이유로 수정해 배포할 때 **함께 빌드**되며, 그때 버전 +0.01·DB 버전 갱신·크롬에서 그래프 글자 크기 확인 후 이 항목을 「배포됨(버전)」으로 바꾼다. 쓰레드 쇼핑제휴(v1.79)에는 이미 배포됨.

## 2026-10-22 — 배포판 `SNS_Auto_Posting_Kit_v1.08` 포장 (Claude Code 윈도우)
- `python scripts/make_lecture_kit.py --version v1.08 --out D:PDSAIMater_KIT` → 299개 파일, 비밀값·DB 대조 통과, 짧은 경로 독립 모드 `npm ci`+`build` 통과.
- 포장 전 DB 대조가 카드뉴스 병합(`cns_*`·`cardnews-images`)·공지 띠(`notices`)를 잡음 → 카드뉴스는 독립 모드에서 이미 건너뜀(메뉴·게시글 관리 칸·예약 실행·남은 예약 세기·7일 그래프)이라 `KIT/kit.json` `schemaCheckIgnore`에 등록. **공지 띠는 독립 모드 처리가 없어** `src/app/(dashboard)/layout.tsx`에서 `!IS_STANDALONE`일 때만 그리게 함(운영 동작 같음 — **미배포, 다음 배포 때 함께**). `KIT/README.md` 업데이트 내역 v1.08 줄(포장 전에 넣음).
- 카드뉴스 화면 주소(`/cardnews`)는 배포판에서 메뉴로 갈 수 없지만 주소를 직접 치면 열림(표가 없어 목록이 비거나 오류) — 검토 대기(`docs/IMPROVEMENTS.md`).

## 2026-10-22 ✅ 배포됨(v1.48, 2026-10-22) — 카드뉴스 기록 API 「최근 7일 게시 완료만」 조회
- **✅ 배포됨(v1.48) — 다음 빌드 때 함께였던 항목 — 「최근 7일 게시 완료만」 조회(2026-10-22 주인님 지시: 따로 빌드하지 않고 이 프로그램을 다음에 수정·배포할 때 같이)**
  - 왜: 「📊 최근 7일 게시」 그래프(공용 `insta-week-posts`)가 게시 기록 API의 최근 30건(생성 순)만 받아서 세므로, 일주일에 30건 넘게 만들거나 예약이 많은 회원은 그래프·그날 목록이 덜 나온다.
  - 할 일: `src/app/api/cardnews/instagram/posts/route.ts`의 GET에 `?week=1`을 받으면 `status=published`·`published_at` ≥ 한국 시간 6일 전 0시(`weekStartIso()`, `lib/weekChart/bucket.ts`)·`order(published_at desc)`·`limit(500)`로 돌려주게 추가(기존 응답은 그대로 — 예약 요약·기록 화면이 계속 씀). 그다음 공용 기준 `insta_auto_poster/src/components/weekChart/InstaWeekPosts.tsx`가 `postsUrl + "?week=1"`로 부르게 바꾸고 `node scripts/check-shared-modules.mjs --sync`. 카드뉴스 기록 API는 공용 코드가 아니라 이 프로그램에서 직접 고친다. `InstaWeekPosts.tsx`는 이 프로그램이 **기준**이라 여기서 고친 뒤 `--sync`(AI 인플루언서·웹툰 사본). 대시보드 그래프(`src/lib/instaWeek.ts`)는 이미 서버에서 7일·게시 완료 조건으로 세므로 해당 없음.
  - 검수: 그래프 합계가 DB의 최근 7일 게시 완료 수와 같은지(30건 넘는 시험 데이터는 만들지 않고 쿼리 조건으로 확인), 막대 누르기·예약 요약 줄이 그대로인지. 배포 뒤 이 항목을 「배포됨(버전)」으로 바꾼다.

## 2026-10-22 ✅ 배포됨(v1.48, 2026-10-22) — 카드뉴스 게시 뒤 썸네일용 이미지 1장 남기기
- **✅ 배포됨(v1.48) — 다음 빌드 때 함께였던 항목 — 게시 뒤 썸네일용 이미지 1장 남기기(2026-10-22 주인님 지시: 따로 빌드하지 않고 다음 수정·배포 때 같이)**
  - 왜: 그날 게시 목록(공용 `week-reply-panel`)에 썸네일을 보이고 싶은데, `src/lib/cardnews/instagram/posts.ts`가 게시 완료(즉시·예약·이미 올라감 확인) 직후 `removeImages(post.image_paths)`로 저장소 파일을 **모두** 지워서 지금은 썸네일이 없음(2026-10-22 v1.46에서 썸네일을 뺀 이유).
  - 할 일: 게시 **성공** 때만 첫 장(`image_paths[0]`)은 남기고 나머지만 지움(실패·취소는 지금처럼 전부 삭제). 남긴 장은 기존 30일 정리(`cleanupOldPosts` — 생성 30일 뒤 행과 이미지 삭제)가 그대로 지우므로 별도 정리 불필요. 그다음 ① 게시 기록 API가 `image_paths`를 돌려주고 ② 공용 `InstaWeekPosts`(기준 `insta_auto_poster`)에 `thumbUrl: publicImageUrl(r.image_paths, imageBucket)`와 `imageBucket` 항목을 되살리고 ③ INSTA 대시보드 `src/lib/instaWeek.ts`의 카드뉴스·AI 인플루언서·웹툰·네컷 `image` 칸을 `image_paths`로(카드뉴스 저장소 `cardnews-images`, 나머지 `insta-post-images`). 되돌릴 코드는 커밋 `3e7ecf43`(썸네일 추가)·`bf0b8479`(뺌)에 있음. 카드뉴스 쪽은 이 프로그램에서 직접 고침(즉시 게시 `src/app/api/cardnews/instagram/publish/route.ts` 포함). `InstaWeekPosts`·`instaWeek.ts` 변경도 이 프로그램이 기준.
  - 검수: 게시 완료 행의 첫 장 주소가 200으로 열리는지 실제로 확인(2026-10-22 교훈 — 주소가 404면 깨진 그림), 30일 정리 뒤 남은 장도 지워지는지 코드로 확인. 배포 뒤 이 항목을 「배포됨(버전)」으로.

## 2026-10-22 ✅ 배포됨(v1.48, 2026-10-22) — 배포판에서 `/cardnews` 주소 직접 입력 시 대시보드로
- **다음 INSTA 배포 때 함께(2026-10-22 주인님 지시)**. 배포판(독립 모드)은 카드뉴스 표가 없고 메뉴도 숨기지만 주소를 직접 치면 카드뉴스 화면이 열려 목록이 비거나 API 오류. 할 일: `src/app/(dashboard)/cardnews/layout.tsx`(서버 컴포넌트로 감싸거나 새 서버 레이아웃)에서 `IS_STANDALONE`이면 `redirect("/dashboard")`. 운영(`IS_STANDALONE` false)은 동작 같음. 검수: 독립 모드 로컬 빌드에서 `/cardnews` → `/dashboard`로 이동, 운영은 카드뉴스 홈 그대로. 그다음 배포판을 다시 포장할 때(v1.09) 함께 들어감. 상세: `docs/IMPROVEMENTS.md` 2026-10-22.

## 2026-10-22 ✅ 배포됨(v1.48, 2026-10-22) — 좁은 칸 버튼 줄바꿈/잘림 수정 (Claude Code 윈도우, 커밋 f0871e568)
- src/components/settings/ApiKeyRow.tsx: 버튼·짧은 문구에 whitespace-nowrap, 버튼 묶음 shrink-0(필요하면 flex-wrap). 기능·문구 변경 없음. **급하지 않아 배포하지 않음(주인님 B안) — 다음에 이 프로그램을 배포하는 CLI가 함께 내보내고 버전 +0.01, 이 항목을 「배포됨(버전)」으로 바꿀 것.** 근거: 루트 docs/UI_WRAP_AUDIT_20261022.md, 규칙 DESIGN.md 원칙 19.

## 2026-10-22 v1.47 — 다른 프로그램이 넘긴 첨부 이미지 받기(감성 글귀 이미지) (Claude Code 윈도우, 이미지 재비교 L6)
- `posts/new?imageUrl=`: 새 `src/lib/importImage.ts`(`acceptImportImage`)가 서버 페이지에서 **로그인한 회원 본인 폴더**(`insta-post-images/<본인 ID>/<이름>.jpg|png|webp`, 쿼리 없는 우리 Supabase 공개 주소)인지 검사 → `PostForm`의 새 `initialImageUrl`로 첫 슬라이드에 넣음. 캡션은 기존 `?caption=`. 캡션 + 이미지가 있으면 기존 「AI 없이 그대로 저장」(`readyWithoutAi`) 경로.
- 검수: tsc 0, 새 `npm run test:import` 2개·기존 `test:cardnews` 52개, build, 배포 `insta-auto-poster-mzzxbulqe` Ready(운영 `auto-instagram-posting.buylife.xyz`), DB v1.47. 크롬(시험 회원): 본인 폴더 시험 그림(1080×1080) + 캡션으로 새 글 화면 → 첫 슬라이드·캡션 채워짐 확인, [게시물 생성하기]는 안 누름, 시험 그림 삭제.

### 2026-10-22 v1.48 — 카드뉴스 최근 7일 게시 완료 조회 · 게시 뒤 썸네일 1장 · 배포판 /cardnews → 대시보드 (Claude Code 윈도우)
- 기록 API `GET ?week=1`: `status=published`·`published_at` ≥ 한국 시간 6일 전 0시·게시 시각 내림차순·최대 500건(기존 응답은 그대로). 공용 `InstaWeekPosts`가 이 주소로 불러 「📊 최근 7일 게시」가 최근 30건에서 멈추지 않음.
- 게시 성공 때 첫 장 이미지를 남김(`removeImagesKeepThumb` — 예약 실행·「이미 올라감」 확인·즉시 게시(기록 저장까지 성공했을 때만)). 실패·취소는 지금처럼 전부 삭제, 남긴 장은 30일 정리(`cleanupOldPosts`)가 행과 함께 지움. 그날 목록 썸네일 되살림(배포 전 기록은 그림이 이미 지워져 패널이 숨김).
- 함께 나간 저장소 변경: 공용 그래프 글자 크게(`9479f0bc`) 등 보류분.
- 검수: tsc·테스트(웹툰 22·인플루언서 18·네컷 56)·로컬 build, 로그인 없이 `?week=1` 401, 크롬(관리자 로그인) 버전 표시·`?week=1` 200·전부 게시 완료 행(이 계정 최근 7일 게시 0건이라 막대 높이·썸네일 실제 모양은 미확인). 커밋 `cb7490943`(7일 게시 완료 조회)·`2814ec839`(썸네일 1장)·`503456cbe`(배포판 /cardnews)·`cb2c488c5`(네컷 그래프)·`2dc19dac2`(버전). 비용: Vercel 빌드 4곳 각 1회(승인 범위 안), 유료 AI 호출 없음.
- 카드뉴스 기록 API `src/app/api/cardnews/instagram/posts/route.ts`에 `?week=1`·`image_paths`, `src/lib/cardnews/instagram/posts.ts`·즉시 게시 route에 첫 장 남기기, 카드뉴스 홈은 `imageBucket="cardnews-images"`. 대시보드 `src/lib/instaWeek.ts`는 카드뉴스·AI 인플루언서·웹툰·네컷 썸네일을 `image_paths[0]`로(배포 확인: 오늘 막대 누르면 「이날 게시한 글이 없어요」 — 조회 오류 없음).
- 배포판(독립 모드)에서 `/cardnews` 주소를 직접 치면 `src/app/(dashboard)/cardnews/layout.tsx`가 `/dashboard`로 보냄. 운영은 카드뉴스 홈 그대로(크롬 확인). **독립 모드 실제 화면 이동은 다음 배포판 포장(v1.09) 시험 때 확인할 것.**
- 「좁은 칸 버튼 줄바꿈」 세션 미배포 변경(`f0871e568`)·다른 세션의 v1.47 변경도 이 배포에 함께 나감. 배포 `auto-instagram-posting.buylife.xyz` READY, DB `auto-instagram-posting` v1.48.

### 2026-10-22 v1.49 — 떡상 리메이크에 「🎬 릴스 영상 올리기」 (Claude Code 윈도우, 묶음 ② 인스타 레퍼런스 분석)
- 플랜 `docs/PLAN_20261022_REELS_REMAKE.md`. 외부 `15_cardnews` 기능만 참고(코드·프롬프트 안 옮김). 주인님 승인 범위 ①③④ → **인스타그램 로그인 방식 토큰에는 `business_discovery`가 없음**(시험 회원 토큰 무료 요청 `Tried accessing nonexisting field`, 시험·관리자 계정 모두 이 방식) → 「릴스 파일 올리기」로 변경 승인. 자동 수집(공식 API·Apify)은 하지 않음.
- `src/lib/cardnews/reelsMedia.ts`(새): 영상 파일을 **이 브라우저 안에서** 장면 4장(10~90% 시점, 긴 변 720px JPEG)과 소리(모노 12kHz 16비트 WAV, 앞 90초 ≈ base64 2.9MB)로만 바꿈 — 파일은 서버·저장소로 보내지 않음(Vercel 요청 한도 4.5MB). 소리를 못 풀면 장면만.
- `RemakePanel`: 릴스 칸(파일 이름·길이·장면 미리보기·소리 길이·빼기), 장면 4장이 있으면 캡처는 2장까지, 보낼 자료가 4.3MB를 넘으면 보내기 전 안내, 분석 AI가 Gemini가 아니면 소리는 빼고 장면만(안내 문구).
- 분석 API `remake/analyze`: `audio`(audio/wav·base64·3MB 이하, **Gemini만** — 다른 AI면 400 안내)·`reelFrames` 받음. `llm.ts` Gemini에 소리를 이미지 뒤 `inlineData`로. 프롬프트에 「앞 n장은 릴스 장면」·「릴스 소리 받아써서 summary·keyFacts에 반영, 배경음만이면 무시」.
- 매뉴얼 `/cardnews/guide` 떡상 리메이크 FAQ에 릴스 사용법 한 단락.
- 검수: tsc, `test:cardnews` 56개(새 4개: 장면 시점·WAV 머리글/최대 크기·프롬프트·Gemini 요청에 소리 포함), `test:own-meta`, build, 배포 `insta-auto-poster-m3wh1f8mm` Ready, DB v1.49. 크롬(시험 회원, Gemini 본인 키): Shots에서 만든 본인 46초 MP4(17.6MB, 내레이션 있음)를 넣어 약 1초 만에 「장면 4장 · 소리 46초」 → 떡상 분석 39초 성공 → 요약·핵심 사실에 내레이션에만 있는 말(「식은땀」·「주민등록번호 같은 ISBN」)이 들어가 소리 반영 확인 → 관점 TOP 3 → 1위 선택 시 주제·4장 자동 입력. 시험 회원 카드뉴스 작업 초안 1개가 남음(본인 데이터, 30일 정리).
- 미확인: Gemini가 아닌 AI로 장면만 분석, 소리 없는 영상, mov·webm 파일, 휴대폰 브라우저에서의 추출 속도.
- 비용: Vercel 빌드 1회, Gemini 분석 1회 약 $0.02~0.05(시험 회원 본인 키) — 주인님 승인 범위.

### 2026-10-22 v1.50 — 🔍 인기 게시물 자동 수집(공식 API + 회원 Apify) · 긴 릴스(최대 3분) · 장면 시점 (Claude Code 윈도우)
- 주인님 지시 「다른 계정 인기글 자동 수집이 가능해야 돼」 → 승인(공식 API + Apify 둘 다, DB 변경 1건).
- **DB(운영 `esgxyikcnnvmlhygjkth`, 크롬 SQL 편집기, 주인님 승인)**: 공용 `user_api_keys` 허용 목록에 `apify` 추가(기존 이름 그대로 앞에 붙임, 결과 정의 `{apify,elevenlabs,fal,…}` 확인). 기록 `supabase/migrations/20261022190000_apify_collect_v1_50.sql`. 공용 항목이라 다른 프로그램도 같은 토큰을 다시 등록하지 않고 쓸 수 있음.
- 설정 「🔥 인기 게시물 수집 (선택)」 칸(Apify 토큰, 발급 위치·무료 크레딧·본인 책임 안내). 배포판(독립 모드)은 카드뉴스가 없어 이 칸을 숨김(키트 DB 구조 변경 없음).
- API `POST /api/cardnews/remake/collect`: `search`(계정·해시태그) — **계정 + Facebook 페이지 방식 연결 회원은 공식 API `business_discovery`(무료)**, 그 밖(Instagram 로그인 방식 회원의 계정, 해시태그)은 **회원 본인 Apify 토큰**(`apify~instagram-scraper` run-sync, 최근 20개). 토큰 없으면 등록 안내(`needApiKey`), 401/402 문구. `images` — 고른 게시물 이미지(인스타·페이스북 이미지 서버만, 최대 6장)를 서버가 받아 `sharp`로 1024px JPEG(base64)로 줄여 돌려줌(브라우저는 CORS로 못 받음). 수집 결과는 저장하지 않음.
- `src/lib/cardnews/collect.ts`(순수): 계정·해시태그 다듬기, Apify·공식 API 결과 공통 모양, 반응도 = 좋아요 + 댓글×3 + 조회수×0.05, 중복 제거 상위 5개, 원문 칸 글(출처·반응 수·주소·캡션).
- 화면 `CollectPanel.tsx`(떡상 리메이크 맨 위): @ 계정 / # 해시태그 → 상위 5개(썸네일·좋아요·댓글·조회·캡션 두 줄) → 「🔥 이 게시물로 분석」이 원문 칸과 캡처 이미지를 채움 → 기존 떡상 분석. 릴스는 표지·캡션만(말소리는 「릴스 영상 올리기」 안내).
- 추가개선 ①: 릴스 소리 최대 3분 — 길이에 맞춰 90초까지 12kHz 16비트, 135초까지 낮춘 16비트, 그 이상 8kHz 8비트(`pickAudioFormat`, 3MB 안). 처음 제안한 저장소 + Gemini 파일 업로드 방식보다 싸고 단순(저장 용량 없음). ②: 릴스 장면 아래 시점(초).
- 검수: tsc, `test:cardnews` 59개(수집 3개 추가·소리 형식 보강), `test:own-meta`, build, 배포 `insta-auto-poster-onsc9zw8q` Ready, DB v1.50. 크롬(시험 회원): v1.50·수집 칸·장면 시점(5·17·29·41초)·안내 「앞 180초」, 토큰 없이 해시태그 → 400 등록 안내, 잘못된 계정 이름·인스타 외 이미지 주소 거절.
- **미검수**: Apify 실제 수집(시험 회원 Apify 토큰 등록 필요 — 주인님), 공식 API 경로(시험 회원이 Facebook 페이지 방식이어야 함), 90초 넘는 릴스 실제 분석.

### 2026-10-22 v1.51 — 해시태그는 Apify 전용 수집기 · 오류 항목 안내 · 실제 수집 검수 (Claude Code 윈도우)
- 시험 회원 Apify 토큰 등록(주인님) 후 실측: 범용 수집기(`apify~instagram-scraper`)에 해시태그 주소를 넣으면 `no_items`($0.0027) → 해시태그는 전용 `apify~instagram-hashtag-scraper`(`hashtags`·`resultsType: posts`·`resultsLimit`)로. 결과 없이 오류 항목만 오면 「공개 게시물을 찾지 못했습니다」 등 이유 안내.
- 크롬(시험 회원) 실검수: **@nasa 계정 수집 성공**(26초, Apify $0.054) → 반응도 상위 5개(1위 좋아요 208만·댓글 6,253, 2위 릴스 조회 1,057만) 썸네일 5개 표시 → 「🔥 이 게시물로 분석」 → 원문 칸(출처·반응 수·주소·캡션)·이미지 3장 채움 → Gemini 떡상 분석 23초 성공(NASA 게시물 내용 요약).
- **한글 해시태그 `#재테크`는 전용 수집기도 빈 결과**(Apify 로그 「NO RESULTS … private or has no posts」, $0.0026) — 우리 요청은 정상, Apify·인스타 쪽 제한으로 판단. 원인 좁히기(영문 해시태그·`keywordSearch` 옵션)는 비용 승인 범위 밖이라 미시험(`docs/IMPROVEMENTS.md`).
- 검수: tsc·`test:cardnews` 59·build, 배포 `insta-auto-poster-4khiuh7va` Ready(빌드 1회 — 주인님 추가 승인), DB v1.51. 비용: 빌드 1회, Apify 3회 합계 약 $0.059, Gemini 1회 약 $0.02~0.05(모두 시험 회원 본인 토큰·키, 승인 범위).

### 2026-10-22 v1.52 — 🔥 상위 3개 묶어 분석 · ★ 경쟁 계정 즐겨찾기(공용 표 `member_watch_accounts`) (Claude Code 윈도우)
- 주인님 승인: 추가개선 1·2(빌드 1회·Apify 1회·Gemini 1회), 즐겨찾기 저장은 「B. 회원별 DB 표」.
- **DB(운영 `esgxyikcnnvmlhygjkth`, 크롬 SQL 편집기)**: 공용 표 `member_watch_accounts`(user_id·platform(instagram/threads/youtube/tiktok)·handle·created_at, unique(user_id,platform,handle), RLS 본인만 select·insert·delete) — 결과 rows 0·policies 3·rls true. 다른 프로그램도 platform으로 재사용. 기록 `supabase/migrations/20261022210000_member_watch_accounts_v1_52.sql`. 계정 이름만 저장(30일 생성 데이터 아님), 회원당 20개.
- 수집 API `collect`: `watch_list`·`watch_add`·`watch_remove`(회원 세션 클라이언트 → RLS로 본인 것만). `collect.ts`: `bundleImageUrls`(게시물마다 고르게 최대 6장)·`remakeBundleText`(「여러 게시물의 공통 성공 패턴」 지시 + ①②③ 출처·반응 수·캡션).
- 화면 `CollectPanel`: 계정 입력 옆 ☆ 즐겨찾기 / ★ 즐겨찾기됨, 「★ 즐겨찾는 계정」 칩(누르면 바로 수집·✕ 빼기), 결과 위 「🔥 상위 3개 묶어 분석」.
- 검수: tsc, `test:cardnews` 60개(묶음 1개 추가), build, 배포 `insta-auto-poster-m9mo7w5og` Ready, DB v1.52. 크롬(시험 회원): nasa 즐겨찾기 → 「즐겨찾기됨」·칩 → 새로고침 뒤 칩 유지(DB 행 `instagram:nasa` 1건, 비로그인 조회 빈 목록) → 칩 눌러 수집 14초(Apify $0.054) → 묶어 분석 → 원문 ①②③·이미지 5장(릴스는 표지 1장) → Gemini 33초 성공, 세 게시물을 묶은 공통 패턴(압도적 비주얼 + 인간 승리 서사) 요약·관점 TOP 3.
- 시험 회원 즐겨찾기에 `nasa` 1건이 남음(본인 데이터, 필요하면 칩 ✕로 삭제).

### 2026-10-22 v1.53 — AI 상세페이지 자동화 섹션 이미지 받기 (Claude Code 맥미니 · 배포 대기, 상세페이지 S-22-10 2단계)
- `posts/new?from=shop-detail&shopImage=<비공개 버킷 위치>&caption=<초안>`: 새 `src/lib/shopDetailImport.ts`(쓰레드 쇼핑제휴 v1.81과 같은 방식)가 위치 형식(`<uuid>/products/…\.(png|jpe?g|webp)`, `..` 거절)·**로그인 회원 본인 폴더**인지 확인 → 회원 본인 세션으로 `shop-detail-images`에서 내려받기(8MB 넘으면 거절) → 「직접 첨부」와 같은 공개 버킷 `insta-post-images/<본인>/sd-<sha256 앞 24자>.<확장자>`에 `upsert:false`로 올림(이미 있으면 그대로 사용 — 새로고침해도 늘지 않음). 쓰기 전에 `requireProgramAccess()`. 서명 주소·관리자 키 안 씀.
- 화면: 첫 슬라이드에 이미지, 캡션은 기존 `?caption=`, 초록/빨간 안내(다크 테마). 캡션+이미지가 있어 기존 「AI 없이 그대로 저장」 경로.
- 버전 `src/lib/version.ts` v1.53, SQL `supabase/migrations/20261022220000_shop_detail_import_v1_53.sql`(버전만). 검수: tsc 0, 복사본 이름이 「직접 첨부」 규칙(`acceptImportImage`)과 맞음 확인. `npm run test:import`는 맥미니에서 esbuild(윈도우용 설치) 때문에 실행 불가 → 윈도우에서 배포 전 실행.
- 함께 나갈 보류분: 이 문서의 「✅ 배포됨(v1.48)」 이후 미배포 항목 없음(확인함).

### 2026-10-22 v1.53 배포 — 해시태그 키워드 검색 + 맥미니 v1.53(상세페이지 이미지 받기) 함께 (Claude Code 윈도우)
- 원인 좁히기(주인님 승인, Apify 직접 호출 2회 $0.013): 해시태그 수집기 기본 방식은 영문 `#money`도 좋아요 0~1개 최신 글, 한글 `#재테크`는 빈 결과 → **`keywordSearch: true`** 이면 한글도 수집되고 반응 좋은 글이 옴. `collect/route.ts` 해시태그 입력에 켬.
- **함께 나간 것**: 맥미니 Claude Code가 커밋만 해 둔 v1.53(`5534ec8ce`, AI 상세페이지 자동화 섹션 이미지 받기 `from=shop-detail&shopImage=`, 「배포·DB 대기」)이 이 배포에 포함됨 → 두 변경을 하나의 v1.53 첫 배포로 정리(빌드 추가 없음). 그 세션은 작업 중 표에 줄이 없었고 윈도우 쪽은 v1.52 작업 줄을 지운 직후였음. 상세페이지 쪽(v1.20)은 미배포라 받는 쪽 실검수는 그 작업 범위로 남김.
- 검수: tsc·build, 배포 `insta-auto-poster-pzp6vjepn` Ready, DB v1.53, 크롬(시험 회원) `/posts/new` v1.53 정상 열림(오류 없음), `#재테크` 수집 12초 성공 — 조회 400만·264만 등 실제 재테크 인기 릴스 5개(Apify $0.0208). 비용: 빌드 1회, Apify 합계 약 $0.034(시험 회원 토큰, 승인 범위).
- 2026-10-22 상세페이지 v1.20 배포 뒤 맥미니 크롬(시험 계정)으로 받는 쪽 확인: 이미지 1장·캡션 초안·초록 안내, 새로고침 1장 유지, 남의 회원 ID 차단 — 통과(Claude Code 맥미니).

### 2026-10-22 v1.54 — 🎬 수집한 릴스 영상까지 분석(Gemini 파일) · 유형 필터 (Claude Code 윈도우)
- 주인님 승인(1·2 모두, 빌드 1회·Apify 1회·Gemini 1회). 약관: 인스타 영상 자동 받기는 회색 지대 → 「분석용으로 잠깐 받고 저장하지 않음·공개 게시물만·본인 책임」 안내.
- `src/lib/cardnews/ai/geminiFiles.ts`(새): Gemini Files API 재개 가능 업로드(start → upload, finalize) → ACTIVE 대기(최대 약 90초, FAILED·시간 초과면 지우고 오류) → `deleteGeminiFile`. 키는 `x-goog-api-key` 헤더로만.
- 수집 API `reel_video`: 인스타·페이스북 영상 서버 주소만, 100MB까지 스트림으로 받아(`readCapped`) 회원 본인 Gemini 키(카드뉴스 `getUserApiKey`)로 업로드 → 파일 참조만 돌려줌(우리 저장소 저장 없음). 분석 API: `geminiFile`(이름 `files/…`·주소 일치·video/* 검사 `isGeminiFileRef`)·Gemini만 → `callLlm`에 `videoMimeType`과 함께 → **성공·실패 모두 `finally`에서 Gemini 파일 삭제**.
- `collect.ts`: 수집 결과에 `videoUrl`(Apify `videoUrl`, 공식 API VIDEO의 `media_url`), `filterPosts`·`CollectFilter`. 서버는 가져온 20개를 반응도순으로 모두 돌려주고 화면이 유형 필터 후 상위 5개 표시(필터해도 5개가 남게).
- 화면: 「전체·릴스·캐러셀·사진 n」 칩(0개는 비활성), 릴스마다 「🎬 영상까지 분석」(Gemini일 때만), 첨부되면 「🎬 수집한 릴스 영상이 첨부됐습니다」 띠(빼기), 분석 뒤 자동으로 비움.
- 검수: tsc, `test:cardnews` 63개(영상 주소·필터·파일 참조·영상 형식 전달 3개 추가), build, 배포 `insta-auto-poster-mxszh7hjg` Ready, DB v1.54. 크롬(시험 회원): `#재테크` 15초 → 칩 「전체 8·릴스 8·캐러셀 0·사진 0」 → 1위 릴스(조회 400만) 「🎬 영상까지 분석」 11초 → 떡상 분석 36초 성공 — 캡션은 「이것만큼은 알아두세요… 2030」뿐인데 결과에 영상 속 ETF 3종(SCHD·SPMO·SMH)·구성 종목·계좌 수익 +77.68%가 나와 화면·말 반영 확인 → 시험 회원 Gemini 파일 목록에 `remake-reel` 파일 0개(삭제 확인).
- 비용: 빌드 1회, Apify $0.0208, Gemini 영상 분석 1회 약 $0.01~0.03(시험 회원 본인 토큰·키, 승인 범위).

### 2026-10-22 v1.55 — OpenAI·Claude 엔진에서도 수집한 릴스 「🎙 말소리까지 분석」 (Claude Code 윈도우)
- 정정: v1.54 기록에 「다른 AI용 받아쓰기는 서버에 ffmpeg가 없어 보류」라고 썼으나 틀림 — OpenAI 받아쓰기(Whisper)는 mp4·mov·webm 영상을 그대로 받는다(25MB까지). 주인님 승인 후 구현.
- 수집 API `reel_video`에 `mode: "transcribe"`: 회원 본인 OpenAI 키(카드뉴스 `getUserApiKey(…, "openai")`, 없으면 등록 안내 — Claude로 분석해도 받아쓰기는 OpenAI)로 `whisper-1` 받아쓰기, 25MB까지(`MAX_TRANSCRIBE_BYTES`), 받아쓴 글만 돌려줌(저장 없음). 401/429/실패 문구.
- 화면: 분석 AI가 Gemini가 아니면 릴스 버튼이 「🎙 말소리까지 분석」 → 원문 칸에 `withTranscript`(「[릴스 말소리 받아쓰기 — 영상에서 실제로 말한 내용]」 + 글, 12000자 한도)로 붙임 → 기존 분석 그대로(분석 API 변경 없음). Gemini면 v1.54 「🎬 영상까지 분석」 그대로.
- 검수: tsc, `test:cardnews` 64개(받아쓰기 붙이기 1개 추가), build, 배포 `insta-auto-poster-2s2g2q6ek` Ready, DB v1.55. 크롬(시험 회원, 새 탭 — 이 세션의 연결 브라우저가 다른 세션의 웨일로 바뀌어 있어 메인 크롬으로 다시 선택): 분석 AI OpenAI(gpt-4.1) → `#재테크` 11초 → 1위 릴스 「🎙 말소리까지 분석」 18초 — 「아직도 S&P500만 사는 거 아니죠? 미국 ETF 추천 3가지! … SCHD … SPMO … SMH …」 받아쓰기 → 떡상 분석 15초 성공(핵심 사실에 ETF 3종·수익률 44% 반영) → 시험 회원 작업의 분석 AI를 Gemini로 되돌림.
- 비용: 빌드 1회, Apify $0.0208, OpenAI 받아쓰기(약 1분 $0.006)·gpt-4.1 분석 1회 약 $0.01~0.02(시험 회원 본인 키, 승인 범위).

### 2026-10-22 v1.56 — 받아쓰기 후킹·본문·마무리 나누기 · 분석 재료 배지 (Claude Code 윈도우)
- 주인님 승인(빌드 1회, 유료 호출 없음). `collect.ts` `splitTranscript`(AI 없이 문장 부호·줄바꿈으로 첫 문장/가운데/마지막 문장) → `withTranscript`가 「▶ 후킹(첫 문장 — 표지 카피 참고) · ▶ 본문 · ▶ 마무리(마지막 문장 — 행동 유도 참고)」로 원문에 붙임(캡션은 위에 그대로).
- `RemakePanel` 「분석 재료」 배지(`aria-label="분석에 들어갈 재료"`): 📝 원문 n자(받아쓰기 제외 캡션 길이)·🎙 받아쓰기·🔗 주소·🖼 캡처 n장·🎞 릴스 장면 n장·🔊 소리 n초(Gemini 아니면 「🔇 소리 제외」)·🎬 영상 첨부 — 있는 재료만.
- 검수: tsc, `test:cardnews` 65개(나누기 1개 추가·기존 받아쓰기 기대값 갱신), build, 배포 `insta-auto-poster-pq3n1l0uw` Ready, DB v1.56. 크롬(시험 회원, 새 탭): 받아쓰기 형식 원문 + 시험 릴스 파일 → 배지 「📝 원문 8자 · 🎙 받아쓰기(후킹·본문·마무리) · 🎞 릴스 장면 4장 · 🔊 소리 46초」, 화면 캡처 확인 → 시험 원문 비움. 유료 호출 없음.

### 2026-10-22 v1.57 — 떡상 리메이크 문구 베끼기 방지 (Claude Code 윈도우, 공용 `reference-copy-guard` 사본)
- 주인님 승인(플랜 B, 빌드 1회·AI 시험 1~2회). 공용 기준 `shorts-onestop-studio/src/lib/reference.ts`의 사본 `src/lib/cardnews/referenceCopy.ts`(직접 고치지 말고 기준 수정 후 `node scripts/check-shared-modules.mjs --sync`).
- 문구 API `cardnews/copy`: 리메이크일 때 화면이 보낸 `remake.sourceText`(수집 캡션·받아쓰기·붙여 넣은 글, 12000자)에서 `[`·`http`로 시작하는 표시 줄을 빼고 검사 대상으로 → 프롬프트에 「원본 문장 사용 규칙」(사실·항목은 쓰고 문장은 새로, 연속 6어절 금지, 숫자·고유명사 허용) → 모든 글자 칸을 연속 6어절 겹침 검사 → 겹치면 그 구절을 피하라고 1회 다시 요청, 덜 겹치는 쪽 사용 → 응답 `{ pages, copied }`.
- 화면 `cardnews/copy`: 겹친 구절이 남으면 노란 안내(개수·앞 3개 구절). 주제로 시작(리메이크 아님)은 검사 없음.
- 검수: tsc, `test:cardnews` 66개(1개 추가), build, 배포 `insta-auto-poster-2t9cy0f7q` Ready, DB v1.57. 크롬(시험 회원, 새 탭): ETF 받아쓰기 형식 원문 → 떡상 분석 → 「반전·경고형」 관점 → 문구 4장 30초 — SCHD·SPMO·SMH·우량주 100종목·엔비디아·TSMC 사실은 살고 문장은 모두 새로 씀, 겹침 안내 없음 → 시험 원문 비우고 탭 닫음(시험 회원 작업 초안은 본인 데이터, 30일 정리).
- 미확인: 겹침이 실제로 남아 노란 안내가 뜨는 화면(AI가 처음부터 새로 써서 재요청 경로가 실제로 돌지 않음 — 순수 함수 시험으로만 확인).
- 비용: Vercel 빌드 1회, Gemini 분석 1회 + 문구 1회 약 $0.01~0.03(시험 회원 본인 키, 승인 범위).

### 2026-10-22 v1.58 — 리메이크 문구 장별 겹침 테두리 · 받아쓰기 → AI 쇼츠 원스톱 (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261022_COPY_GUARD_CARDS_HANDOFF.md`(주인님 승인, 빌드 2회·AI 0회).
- 문구 화면(`cardnews/copy`): 장마다 제목·보조 문구·항목·숫자 설명을 원문과 연속 6어절 겹침 검사(브라우저) → 노란 테두리(`outline-amber-400`)·「⚠ 겹침」, 고치면 바로 사라짐. 검사 대상은 문구 API와 같은 `remakeGuardText`(`src/lib/cardnews/collect.ts`, `[`·주소 줄 제외), 글자 칸 모으기 `pageTexts`도 같은 파일로 옮김(API·화면 공용).
- 떡상 리메이크(`RemakePanel`): 원문에 「[릴스 말소리 받아쓰기」 블록이 있으면 「🎬 이 대사로 쇼츠 만들기」 → `https://shorts-onestop-studio.buylife.xyz/topic#ref-transcript=…`(대사만, ▶ 머리말 제외 `transcriptOf`, 12000자) 새 탭. 대사는 주소 `#` 뒤라 서버로 가지 않음. 넘기기 함수는 공용 `reference-copy-guard` 사본 `referenceCopy.ts`의 `refHandoffHash`.
- 검수: tsc, `test:cardnews` 68개(2개 추가), build, 배포 `insta-auto-poster-10hx8bj0t` Ready, DB v1.58. 크롬(시험 회원, AI 호출 없음): 저장된 ETF 작업 열기 → 원래 문구 겹침 0 → 2장 보조 문구에 원문 문장 붙이기 → 노란 테두리·「⚠ 겹침」(화면 캡처) → 되돌리기 → 사라짐 → 받아쓰기 형식 원문에서 버튼 주소로 이동 → 원스톱 v1.32 참고 자료에 레퍼런스 블록·안내, 주소 `#` 지워짐 → 원문 비움(버튼도 숨음 확인).
- 비용: 빌드 1회(원스톱 1회 별도), AI 호출 없음.
