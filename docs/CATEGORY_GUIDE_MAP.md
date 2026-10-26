# 카테고리 지침 지도 (메인 카테고리 기준 — 모든 CLI 공통)

> **2026-10-24 주인님 지시:**
> - 「각각의 역할 및 카테고리 영역별 메인 지침을 보고 필요하면 보강하거나 수정할 수 있으면 개발 유지보수 업무에 효율성을 올릴 수 있을 것 같아」
> - 「메인 카테고리 기준으로 분류하고 해당 카테고리가 없을 경우 너가 프로그램의 기능·성격에 맞게 추가해서 분류하도록 해. 이후 내가 카테고리 메뉴를 신설할께」
>
> 근거 플랜: [`PLAN_20261024_ADMIN_DEV_DOCS_CENTER.md`](PLAN_20261024_ADMIN_DEV_DOCS_CENTER.md) §2-2.
>
> **이 문서는 무엇인가:** 메인 사이트의 실제 카테고리(DB `categories`)마다 「먼저 읽을 메인 지침 · 비교표·분석 보고서 · 기준(레퍼런스) 프로그램 · 담당 역할 · 관련 외부 분석」을 한 줄로 모은 지도다.
> - 프로그램은 **기능·성격 기준으로 다시 분류**했다. 지금 카테고리와 다르면 「옮기기 제안」, 맞는 카테고리가 없으면 「신설 제안」으로 표시했다.
> - 빈 곳은 「⚠ 보강 필요」로 표시했다.
>
> **이 문서는 DB를 바꾸지 않는다.** 실제 카테고리 신설·이동은 주인님이 관리자 화면(프로그램 편집·카테고리 관리)에서 하신다. 하시고 나면 담당 세션이 이 지도 §1의 「지금 소속」 칸과 §3을 고친다.
>
> **쓰는 법:** 어떤 프로그램을 작업하든 ① §2 공통 지침 ② 그 프로그램 카테고리의 §3 줄 ③ 그 카테고리 담당 역할 파일(`docs/roles/`) 순서로 읽는다. 카테고리 지침을 새로 만들거나 보강하면 같은 작업에서 이 지도의 그 줄을 고친다(여러 세션이 고치므로 [안전 커밋 도우미](CLI_COLLABORATION_RULES.md) 9번 사용).
>
> 작성: Claude Code(윈도우) `claude-win-dotori` `[역할: analysis-planning]`, 2026-10-24.
> - 실제 카테고리·소속은 공개 목록 https://www.buylife.xyz/programs 를 같은 날 읽어 확인했다(16개 카테고리, 공개 프로그램 72개, 읽기만).
> - 비공개·병합된 프로그램은 [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 목록 표 기준이다.

> **✅ 2026-10-24 반영 완료 (주인님 지시: 「너가 프로그램 성격에 맞게 카테고리를 만들고 해당 프로그램을 이동시켜줘」):**
> - 운영 DB `esgxyikcnnvmlhygjkth`에서 카테고리 2개를 신설하고(`ai-prompt` 「AI 프롬프트」 순서 19, `personality-fortune` 「성격·운세」 순서 20), §1-3의 12개 프로그램을 옮겼다.
> - SQL은 [`supabase/migrations/0042_categories_ai_prompt_personality.sql`](../supabase/migrations/0042_categories_ai_prompt_personality.sql)에 있고, 주인님 크롬의 Supabase SQL 편집기에서 실행했다.
> - 실행 전 백업(옮기기 전 소속): `ai-prompt-studio`·`ai-slide-builder`·`ai-writing-editor`·`markdown-studio`·`ui-canvas` = 데이터수집|기획(`scraping&plan`), `mbti-character`·`personality-code`·`personality-suite`·`tarot-reading` = Tools(`tools`), `music-player`·`reverse-prompt` = 영상(`video`), `ai-video-studio` = 유튜브(`youtube`).
> - 공개 목록에서 17개 카테고리·72개 프로그램을 확인했다(프로그램이 없는 카테고리는 목록 본문에 나오지 않음). 크롬으로 「성격·운세」 카테고리 페이지에 4개가 나오는 것도 확인했다.
> - 아래 §1-2·§1-3의 「제안」은 이제 「반영됨」이다. §3 표는 반영 뒤 모습 그대로다.

## 0. 표시
| 표시 | 뜻 |
|---|---|
| ✅ 갖춤 | 그 카테고리 전용 메인 지침(완성 기준·규칙)과 비교표·분석이 모두 있음 |
| △ 일부 | 분석 보고서·대기 목록·매뉴얼은 있으나 **카테고리 전용 메인 지침이 없음** |
| ⚠ 보강 필요 | 전용 지침이 거의 없음 |
| ➡ 옮기기 제안 | 지금 카테고리가 기능과 맞지 않아 다른 카테고리를 추천 |
| 🆕 신설 제안 | 기능에 맞는 카테고리가 없어 새 카테고리를 추천(주인님이 메뉴 신설 예정) |

## 1. 분류 결과 — 기능·성격 기준

### 1-1. 메인 카테고리 (지금 사이트에 있는 16개)
`데이터수집`(`scraping&plan`, 2026-10-24 「데이터수집|기획」에서 이름 변경) · `쓰레드`(`threads`) · `인스타`(`instagram`) · `블로그`(`blog`) · `네이버`(`naver`) · `이미지`(`image`) · `음악`(`music`) · `영상`(`video`) · `유튜브`(`youtube`) · `디자인`(`design`) · `CRM`(`crm`) · `마케팅(홍보)`(`marketing`) · `이커머스`(`ecommerce`) · `업무자동화`(`work-automation`) · `부동산`(`real-estate`) · `Tools`(`tools`)
- 이전 문서들(`DESIGN.md` 17번 규칙 등)의 「공식 14개」에는 `영상`·`디자인`·`업무자동화`가 빠져 있고 `멀티미디어`가 있다. 실제 사이트에는 `멀티미디어`가 없고 `영상`이 있다. **이 지도는 실제 사이트 16개를 기준으로 한다**(`DESIGN.md` 쪽 정리는 그 문서 담당이 판단).

### 1-2. 🆕 신설 제안 카테고리 (2개)
| 신설 이름(안) | slug(안) | 넣을 프로그램 | 이유 |
|---|---|---|---|
| **AI 프롬프트** | `ai-prompt` | `ai-prompt-studio`(지금 데이터수집\|기획) · `reverse-prompt`(지금 영상) · (병합됨 `prompt-template-studio` 기록용) | 둘 다 「다른 AI에 넣을 프롬프트를 만들고 다듬는 도구」다. 데이터 수집도 영상 제작도 아니어서, 지금은 회원이 카테고리로 찾기 어렵다. 프롬프트 도구가 더 생길 때(외부 분석 EXT-TL-09 등) 모을 곳이 필요하다 |
| **성격·운세** | `personality-fortune` | `personality-suite` · `personality-code` · `mbti-character` · `tarot-reading`(지금 모두 Tools) | 넷 다 「자기 점검·성격 유형·운세」로 성격이 같다. 회원가입 유도용 FREE 프로그램이 많아 첫 화면에서 따로 보이면 좋다. 성격·심리 안전 규칙(상표명·위기 안내 — EXT-TL-08)을 한 카테고리 지침으로 묶을 수 있다 |

- 신설하지 않기로 하시면 지금 카테고리(데이터수집|기획·영상·Tools)에 그대로 둔다.

### 1-3. ➡ 옮기기 제안 (지금 카테고리와 기능이 맞지 않는 프로그램)
| 프로그램 | 지금 카테고리 | 추천 카테고리 | 이유 |
|---|---|---|---|
| `music-player`(뮤직 플레이어 자동화) | 영상 | **음악** | 내 음악 파일을 재생·시각화·이퀄라이저로 듣는 도구다. 영상은 만들지 않는다 |
| `ai-video-studio`(AI 영상 스튜디오) | 유튜브 | **영상** | 여러 영상 AI로 영상을 만드는 영상 연동 기준 프로그램이다. 유튜브 업로드 전용이 아니다 |
| `reverse-prompt`(AI 리버스 프롬프트) | 영상 | 🆕 **AI 프롬프트** | 이미지·영상·음악 파일에서 프롬프트를 거꾸로 만드는 도구다 |
| `ai-prompt-studio`(AI Prompt) | 데이터수집\|기획 | 🆕 **AI 프롬프트** | 프롬프트 설계·템플릿 실행 도구다 |
| `ai-writing-editor`(AI 글쓰기 에디터) | 데이터수집\|기획 | **업무자동화** | 문서 작성·교정 도구다(데이터 수집 아님) |
| `markdown-studio`(마크다운 문서) | 데이터수집\|기획 | **업무자동화** | 문서 편집·내보내기 도구다 |
| `ai-slide-builder`(AI 슬라이드) | 데이터수집\|기획 | **업무자동화** | 발표 자료를 만드는 문서 도구다 |
| `ui-canvas`(UI Canvas) | 데이터수집\|기획 | **디자인** | 화면 설계 캔버스다. 같은 계열 `landing-architect`가 이미 디자인에 있다 |
| `personality-suite` · `personality-code` · `mbti-character` · `tarot-reading` | Tools | 🆕 **성격·운세** | §1-2 |

- 옮기면 `데이터수집|기획`에는 `web-crawler-saas`(+ 목록에 안 보이는 `website-scraper`)만 남는다. 이름을 `데이터수집`으로 줄일지는 주인님 판단이다.
- 옮기면 `Tools`는 비게 된다. 성격이 애매한 새 프로그램을 잠시 두는 「기타」 칸으로 남겨 두는 것을 추천한다.

### 1-4. 그대로 두는 것이 맞는 프로그램
- 나머지 공개 프로그램은 지금 카테고리가 기능과 맞다.
- 판단이 갈릴 수 있는 것과 그대로 둔 이유는 다음과 같다.
  - `cinematic-storyboard-studio`(디자인): 영상 기획용 콘티를 이미지로 만드는 도구라 디자인이 맞다.
  - `landing-architect`(디자인): 마케팅 용도지만 결과물이 화면 설계라 디자인이 맞다.
  - `emotion-writer`(이미지): 글귀 카드 이미지라 이미지가 맞다.
  - `naver-blog-seo-studio`(블로그): 네이버 전용이지만 블로그 묶음으로 관리 중이라 블로그가 맞다.
  - `naver-cafe-poster`(네이버): 카페 자동화라 네이버가 맞다.

## 2. 모든 카테고리 공통 지침 (카테고리와 상관없이 먼저)
| 주제 | 문서 |
|---|---|
| 최상위 규칙·대화 규칙 | 루트 [`CLAUDE.md`](../CLAUDE.md)(Codex는 `AGENTS.md`, Gemini는 `GEMINI.md`), [분야별 요약 색인](guidelines/README.md) |
| 회원 본인 계정·키 | [`TOP_RULE_PERSONAL_ACCOUNT_API.md`](TOP_RULE_PERSONAL_ACCOUNT_API.md), [회원 연동 공용 저장](MEMBER_INTEGRATIONS.md) |
| 공용 기준 코드 | [`SHARED_FEATURE_MAP.md`](SHARED_FEATURE_MAP.md), [`SHARED_MODULES.md`](SHARED_MODULES.md), [점검표](SHARED_MODULE_CHECKPOINTS.md) |
| 비교·병합 | [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md), [프로그램 비교 분석 매뉴얼](PROGRAM_COMPARISON_ANALYSIS_GUIDE.md), [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) |
| 예약 기능 | [`SCHEDULER_POLICY.md`](SCHEDULER_POLICY.md) |
| 크롬 확장 | [`EXTENSION_RELEASE_RULES.md`](EXTENSION_RELEASE_RULES.md) |
| 공식 API 없는 화면 자동화 | [`PLATFORM_PATTERNS.md`](PLATFORM_PATTERNS.md) §20(봇 탐지 회피·회원 선택 입력·발행 방식) |
| 디자인·매뉴얼(모든 프로그램 화면) | [`DESIGN.md`](../DESIGN.md), [`PROGRAM_DESIGN_STANDARD.md`](PROGRAM_DESIGN_STANDARD.md), [`MANUAL_AND_INTEGRATION_GUIDELINES.md`](MANUAL_AND_INTEGRATION_GUIDELINES.md) |
| 비용·배포 | [`TEST_COST_POLICY.md`](TEST_COST_POLICY.md), [`VERCEL_COST_REDUCTION_PLAN.md`](VERCEL_COST_REDUCTION_PLAN.md) |
| 에러 교훈 | [`ERROR_LESSONS.md`](ERROR_LESSONS.md) |
| 역할별 현황 | [`roles/README.md`](roles/README.md) |

## 3. 카테고리별 지도 (기능 기준 소속, ➡·🆕 반영 후 모습)

| 카테고리 | 상태 | 프로그램 (운영 / 병합됨) | 메인 지침 | 비교표·분석 보고서 | 기준(레퍼런스) 프로그램 | 담당 역할 | 외부 분석 카드 | 보강할 것 |
|---|---|---|---|---|---|---|---|---|
| **블로그** | ✅ 갖춤 | `ai-auto-blog` `tistory-auto-blog` `blog-keyword` `naver-blog-agent` `naver-blog-seo-studio` `naver-blog-allinone` `blog-content-maker` `blog-workroom` | [블로그 완성 기준](BLOG_AUTOMATION_COMPLETION_POLICY.md), [네이버 편집기 자동화](NAVER_BLOG_EDITOR_AUTOMATION_GUIDE.md), PLATFORM_PATTERNS §20 | [블로그 기능 상세 비교표](BLOG_FEATURE_MATRIX.md), [블로그 통합 분석](analysis-blog-consolidation-20261020/REPORT.md), [통합 작업표](BLOG_CONSOLIDATION_TASKS.md) | 기능별 기준 코드는 블로그 기능 비교표 · [2026-10-25 전체/타카테고리 연계 공통 인수인계](analysis-blog-consolidation-20261020/HANDOFF.md) | `blog` | EXT-BLOG-01~07 | 신규 이웃소통은 [0-A 명세](analysis-naver-blog-neighbor-20261024/SPEC_20261026_BLOG_NEIGHBOR_CARE_0A.md)·운영 미등록/실동작 미검수 |
| **유튜브** | △ 초안 3종(담당 확인 전) | `youtube-viral-studio` `shorts-viral-studio` `playlist-channel-studio` `auto-shorts-posting` `shorts-onestop-studio` `thumbnail-master` `youtube-auto-reply` / 병합됨: `seo-thumbnail-pro` `youtube-channel-consultant` `yt-playlist-studio` | [완성 기준](YOUTUBE_COMPLETION_POLICY.md) · [기능 비교표](YOUTUBE_FEATURE_MATRIX.md) · [통합 작업표](YOUTUBE_CONSOLIDATION_TASKS.md) — 2026-10-24 초안 · 기존: ⚠ 전용 메인 지침 없음(로드맵만) | [유튜브 로드맵](YOUTUBE_AUTOMATION_ROADMAP.md), [유튜브 통합 분석](analysis-youtube-consolidation-20261020/REPORT.md), [카드형 쇼츠 참고 분석](CARD_SHORTS_REFERENCE_ANALYSIS.md) | 공용 `youtube-golden-engine`(채널 컨설턴트 기준) | 없음(영상 부분 `video`, 음악 부분 `music`) | EXT-YT-01~03, EXT-MUS-01·04 | 쇼츠·업로드·댓글 공통 규칙(권한 범위·업로드 정책·수익화 주의) 메인 지침, 담당 역할 |
| **영상** | △ 초안 3종(담당 확인 전) | `ai-video-studio`(➡ 유튜브에서) `infinite-loop-video` `video-to-gif` | [완성 기준](VIDEO_COMPLETION_POLICY.md) · [기능 비교표](VIDEO_FEATURE_MATRIX.md) · [통합 작업표](VIDEO_CONSOLIDATION_TASKS.md) — 2026-10-24 초안 · 기존: ⚠ 전용 메인 지침 없음(플랜·로드맵만) | [무료 영상 렌더링 플랜](PLAN_20261023_FREE_VIDEO_RENDERING.md), [내 PC 고속 변환 로드맵](analysis-pc-renderer-20261024/ROADMAP.md) | `ai-video-studio`(영상 모델 연동·영상 합치기 기준) | `video` | EXT-MM-01·02 | 영상 모델 연동 규칙(이미지 규칙처럼)·브라우저/내 PC 렌더 선택 기준 메인 지침 |
| **음악** | △ 일부 | `music-automation` `music-video-studio` `ai-mastering-studio` `vinyl-lp-studio` `ai-audio-analyzer` `lyric-video-studio` `ai-music-studio` `music-player`(➡ 영상에서) / 병합됨: `suno-music-studio` | ✅ [음악 자동화 기본 지침](MUSIC_AUTOMATION_POLICY.md)(1판 2026-10-25) | [음악 통합 분석](analysis-music-consolidation-20261021/REPORT.md), [음악 스튜디오 플랜](analysis-music-studio-20261023/PLAN.md), [배경음악 공용화 플랜](analysis-music-studio-20261023/BGM_SHARED_PLAN.md), [음악 담당 대기 목록](MUSIC_OWNER_QUEUE_20261024.md) | `ai-music-studio`(음악 모델 연동 기준) | `music` | EXT-MUS-01~07 | 음악 모델 연동 규칙·상업 이용 조건 표시·배경음악 공용 규칙 메인 지침 |
| **이미지** | △ 초안 3종(담당 확인 전) | `image-convert-studio` `style-dna-analyzer` `banana-canvas` `ai-image-studio` `portrait-photo` `four-cut-comics` `fashion-style` `emotion-writer` / 병합됨: `allinone-graphic` `photo-remake-studio` | [완성 기준](IMAGE_COMPLETION_POLICY.md) · [기능 비교표](IMAGE_FEATURE_MATRIX.md) · [통합 작업표](IMAGE_CONSOLIDATION_TASKS.md) — 2026-10-24 초안 · 기존: [이미지 프롬프트 생성 규칙](IMAGE_PROMPT_RULES.md), 루트 CLAUDE.md 「이미지 생성 레퍼런스 규칙」, [이미지 모델 점검](IMAGE_MODEL_AUDIT_20261017.md) | [이미지 통합 분석](analysis-image-consolidation-20261021/REPORT.md) | `ai-image-studio`(이미지 모델 연동 기준) | `ecommerce-image` | EXT-IMG-01~05 | 이미지 카테고리 기능 비교표(블로그처럼) |
| **디자인** | △ 초안 3종(담당 확인 전) | `cinematic-storyboard-studio` `landing-architect` `ui-canvas`(➡ 데이터수집\|기획에서) / 병합됨: `ai-web-ui` | [완성 기준](DESIGN_CATEGORY_COMPLETION_POLICY.md) · [기능 비교표](DESIGN_CATEGORY_FEATURE_MATRIX.md) · [통합 작업표](DESIGN_CATEGORY_CONSOLIDATION_TASKS.md) — 2026-10-24 초안 · 기존: ⚠ 없음(화면 디자인 지침 `DESIGN.md`는 모든 프로그램용) | 없음 | 없음 | 없음(디자인 리뉴얼 역할 `design`과는 다름) | EXT-MKT-01, EXT-MM-03, EXT-TL-10 | 기획안·UI 산출물(JSON·HTML) 형식과 서로 보내기 연동(랜딩 → UI Canvas) 규칙, 담당 역할 |
| **인스타** | △ 초안 3종(담당 확인 전) | `auto-instagram-posting`(폴더 `insta_auto_poster`) `ai-influencer-studio` `instagram-comment-reply` `ai-webtoon-studio` / 병합됨: `cardnews-studio` `instagram-dm-reply` | [완성 기준](INSTAGRAM_COMPLETION_POLICY.md) · [기능 비교표](INSTAGRAM_FEATURE_MATRIX.md) · [통합 작업표](INSTAGRAM_CONSOLIDATION_TASKS.md) — 2026-10-24 초안 | [인스타 통합 분석](analysis-insta-consolidation-20261020/REPORT.md), [인스타 자동 포스팅 매뉴얼](INSTAGRAM_AUTO_POSTER_MANUAL.md), [회원 연동 4단계(인스타)](PLAN_20261020_MEMBER_INTEGRATIONS_STEP4_INSTAGRAM.md) | `auto-instagram-posting`(인스타 연결 `insta_accounts` — 한 번 연결하면 다른 프로그램이 재사용) | 없음 | EXT-INS-01 | 「모든 인스타 프로그램은 예약·즉시 게시 포함」 완성 기준과 인스타 API 권한 범위 메인 지침, 담당 역할 |
| **쓰레드** | △ 초안 3종(담당 확인 전) | `threads-easy-planner` `auto-threads-posting` `threads-comment-reply` `threads-affiliate-poster` `threads-content-ops` | [완성 기준](THREADS_COMPLETION_POLICY.md) · [기능 비교표](THREADS_FEATURE_MATRIX.md) · [통합 작업표](THREADS_CONSOLIDATION_TASKS.md) — 2026-10-24 초안 | [쓰레드 통합 분석](analysis-threads-consolidation-20261023/REPORT.md), 예약 기준 구현 `threads-content-ops`([SCHEDULER_POLICY](SCHEDULER_POLICY.md)) | `threads-content-ops`(예약 기준) | 없음 | 없음 | 회원 본인 Meta 앱 등록 원칙(핵심 원칙 4 감사 이력)·Threads API 권한·게시 규칙 메인 지침, 담당 역할 |
| **네이버** | △ 초안 3종(담당 확인 전) | `naver-cafe-poster` / 비활성: `naver-blog-auto-poster` `naver-blog-auto-poster-web` | [완성 기준](NAVER_COMPLETION_POLICY.md) · [기능 비교표](NAVER_FEATURE_MATRIX.md) · [통합 작업표](NAVER_CONSOLIDATION_TASKS.md) — 2026-10-24 초안 · 기존: [네이버 편집기 자동화](NAVER_BLOG_EDITOR_AUTOMATION_GUIDE.md), PLATFORM_PATTERNS §20 | [공용 네이버 엔진 제안](SHARED_NAVER_ENGINE_PROPOSAL_2026-10-10.md), [회원 연동 5단계](PLAN_20261020_MEMBER_INTEGRATIONS_STEP5_YT_KAKAO_NAVER.md) | 블로그 쪽은 블로그 기능 비교표 | `blog`(블로그 프로그램), 카페는 없음 | — | 네이버 카페 자동화 규칙 |
| **이커머스** | ✅ 3종 담당 확인(2026-10-26 ecommerce-image) | `trending-product-finder` `shop-detail-page` `seller-label-docs` `shop-order-report` / 병합됨: `auto-detail-page` `detail-page-12p` | [완성 기준](ECOMMERCE_COMPLETION_POLICY.md) · [기능 비교표](ECOMMERCE_FEATURE_MATRIX.md) · [통합 작업표](ECOMMERCE_CONSOLIDATION_TASKS.md) — 2026-10-24 초안 | [이커머스 통합 분석](analysis-ecommerce-consolidation-20261021/REPORT.md), [상세페이지 12P 매뉴얼](DETAIL_PAGE_12P_HANDOFF_MANUAL_2026-10-13.md) | `shop-detail-page` | `ecommerce-image` | 없음 | 상세페이지·상품 분석 공통 규칙(쇼핑 API·이미지 권리·광고 표기) 메인 지침 |
| **마케팅(홍보)** | △ 초안 3종(담당 확인 전) | `competitor-analysis` `stepmail` `comment-inbox` `booking-reminder` / 병합됨: `longtail-keyword-expander` | [완성 기준](MARKETING_COMPLETION_POLICY.md) · [기능 비교표](MARKETING_FEATURE_MATRIX.md) · [통합 작업표](MARKETING_CONSOLIDATION_TASKS.md) — 2026-10-24 초안 | [마케팅 통합 분석](analysis-marketing-consolidation-20261023/REPORT.md), [애드센스 승인 매뉴얼](ADSENSE_APPROVAL_MANUAL.md) | 없음 | 없음 | 없음 | 메일·알림 발송 규칙(수신 동의·발송 한도)·경쟁 분석 데이터 범위 메인 지침, 담당 역할 |
| **CRM** | △ 초안 3종(담당 확인 전) | `crm-google-form` `kakao-auto-posting` | [완성 기준](CRM_COMPLETION_POLICY.md) · [기능 비교표](CRM_FEATURE_MATRIX.md) · [통합 작업표](CRM_CONSOLIDATION_TASKS.md) — 2026-10-24 초안 | [회원 연동 5단계(카카오 포함)](PLAN_20261020_MEMBER_INTEGRATIONS_STEP5_YT_KAKAO_NAVER.md) | 없음 | 없음 | 없음 | 개인정보(고객 연락처) 저장·삭제 규칙, 카카오 발송 정책 메인 지침, 담당 역할 |
| **업무자동화** | △ 초안 3종(담당 확인 전) | `ai-work-workspace` `ai-task-planner` `document-translator` `file-merge` `ebook-studio` `ai-doc-chatbot` + ➡ `ai-writing-editor` `markdown-studio` `ai-slide-builder`(데이터수집\|기획에서) / 병합됨: `persona-style-studio` | [완성 기준](WORK_AUTOMATION_COMPLETION_POLICY.md) · [기능 비교표](WORK_AUTOMATION_FEATURE_MATRIX.md) · [통합 작업표](WORK_AUTOMATION_CONSOLIDATION_TASKS.md) — 2026-10-24 초안 | 없음 | 없음 | `workspace`(`ai-work-workspace`), `docbot-prompt`(`ai-doc-chatbot`) | EXT-TL-01~07 | 문서 도구 공통 규칙(파일 크기 한도·회원 문서 30일 보관·내보내기 형식), 담당 역할 |
| **🆕 AI 프롬프트** | △ 초안 3종(담당 확인 전) | `ai-prompt-studio` `reverse-prompt`(➡ 각각 데이터수집\|기획·영상에서) / 병합됨: `prompt-template-studio` | [완성 기준](AI_PROMPT_COMPLETION_POLICY.md) · [기능 비교표](AI_PROMPT_FEATURE_MATRIX.md) · [통합 작업표](AI_PROMPT_CONSOLIDATION_TASKS.md) — 2026-10-24 초안 | 없음 | 없음 | `docbot-prompt`(`ai-prompt-studio`) | EXT-TL-09 | 프롬프트 템플릿 형식·당해 연도 규칙·생성 AI별 내보내기 규칙 |
| **🆕 성격·운세** | △ 초안 3종(담당 확인 전) | `personality-suite` `personality-code` `mbti-character` `tarot-reading`(➡ Tools에서) | [완성 기준](PERSONALITY_FORTUNE_COMPLETION_POLICY.md) · [기능 비교표](PERSONALITY_FORTUNE_FEATURE_MATRIX.md) · [통합 작업표](PERSONALITY_FORTUNE_CONSOLIDATION_TASKS.md) — 2026-10-24 초안 | 없음 | 없음 | 없음 | EXT-TL-08 | 상표명 사용 금지·위기 상담 안내·결과 저장 범위 등 안전 규칙 메인 지침 |
| **데이터수집** | △ 초안 3종(담당 확인 전) | `web-crawler-saas` · (비공개·백업, `is_active=false` 2026-10-24 DB 확인) `website-scraper` | [완성 기준](SCRAPING_COMPLETION_POLICY.md) · [기능 비교표](SCRAPING_FEATURE_MATRIX.md) · [통합 작업표](SCRAPING_CONSOLIDATION_TASKS.md) — 2026-10-24 초안 | [스크래핑 통합 분석](analysis-scraping-consolidation-20261021/REPORT.md)(비교 분석 매뉴얼의 기준 사례) | 없음 | 없음 | — | 수집 범위(robots·약관)·회원 수집 결과 30일 보관 규칙 메인 지침 |
| **부동산** | △ 초안 3종(담당 확인 전) | `real-estate-sales`(폴더 `real_estate_sales`) | [완성 기준](REAL_ESTATE_COMPLETION_POLICY.md) · [기능 비교표](REAL_ESTATE_FEATURE_MATRIX.md) · [통합 작업표](REAL_ESTATE_CONSOLIDATION_TASKS.md) — 2026-10-24 초안 · 기존: ⚠ 없음(공공 데이터 키 예외는 [최상위 규칙 문서](TOP_RULE_PERSONAL_ACCOUNT_API.md) §8) | 없음 | `real-estate-sales` · `realty-listing-alert`(v1.26 준비중·공개 전, 2026-10-25) | 없음 | EXT-RE-01·EXT-RE-02 | 공공 데이터 키 예외 · **네이버 매물은 회원 PC에서만 수집, 우리 서버 요청·보관 금지(2026-10-24 주인님 결정, 새 프로그램 `realty-listing-alert` 인수인계)** · 담당 역할 [realty](roles/realty.md)(2026-10-24 지정, `claude-win-20261024-realty`) |
| **Tools** | — | (➡ 옮기면 비게 됨 — 「기타」로 유지 추천) | — | — | — | — | — | — |

## 4. 정리하면서 발견한 것 (주인님·담당 확인 필요)
- **카테고리 이름이 문서마다 다르다.** 실제 사이트는 16개(`영상`·`디자인`·`업무자동화` 있음, `멀티미디어` 없음)다. `DESIGN.md` 17번 규칙과 [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 분야 칸·[외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) 카테고리는 아직 옛 이름(멀티미디어 등)이다. 개발분석표는 다음 단계(판단 칸 추가)에서 이 지도 기준으로 맞춘다.
  - ✅ 2026-10-24 해결: `DESIGN.md` 17번 규칙·루트 지침 ⑭를 운영 DB 기준 17개로 고치고, 프로그램 비교표 목록 표 분야·버전 칸을 운영 DB 값으로 맞춤(50칸).
- **`website-scraper`는 비교표에는 「운영」인데 공개 목록에는 보이지 않는다**(비공개로 추정). 프로그램 비교표 담당 확인 필요.
  - ✅ 2026-10-24 확인: 운영 DB `is_active=false`(「백업」 카테고리) — 비공개가 맞다. 기능은 `web-crawler-saas`로 옮겨졌고 옛 API는 410을 돌려준다.
- **전용 메인 지침을 갖춘 카테고리는 블로그 하나다.**
  - 블로그는 「완성 기준 + 기능 비교표 + 통합 작업표」 세 가지를 갖춘 덕분에, 담당이 바뀌어도 바로 이어서 병합·배포할 수 있었다(2026-10-24 SEO 스튜디오·에이전트·키워드 연속 배포).
  - 다른 카테고리도 같은 세 가지를 갖추는 것이 보강 목표다.
- **담당 역할이 없는 카테고리**: 유튜브(일부)·디자인·인스타·쓰레드·마케팅·CRM·업무자동화(일부)·AI 프롬프트(일부)·성격·운세·데이터수집\|기획(부동산은 2026-10-24 `realty` 지정). 주인님이 담당을 지정하면 [`roles/README.md`](roles/README.md)와 이 표의 「담당 역할」 칸을 고친다.

## 5. 카테고리 메인 지침을 만들 때의 양식 (블로그 기준)
1. **완성 기준**(예: [블로그 완성 기준](BLOG_AUTOMATION_COMPLETION_POLICY.md)): 그 카테고리 프로그램이 「끝났다」고 말할 수 있는 조건, 회원이 고르는 항목, 하지 않을 것.
2. **기능 상세 비교표**(예: [블로그 기능 상세 비교표](BLOG_FEATURE_MATRIX.md)): 프로그램 × 기능 ○△× 표, 기능별 기준 코드 위치, 병합 방향, 확장 로드맵.
3. **통합 작업표**(예: [블로그 통합 작업표](BLOG_CONSOLIDATION_TASKS.md)): 병합·개선 묶음 번호, 진행 상태.
- 파일 이름은 `docs/<카테고리 영문 slug 대문자>_COMPLETION_POLICY.md`·`_FEATURE_MATRIX.md`·`_CONSOLIDATION_TASKS.md`로 맞춘다(예: `MUSIC_FEATURE_MATRIX.md`). 만들면 이 지도의 그 줄 상태를 고친다.

## 변경 기록
- 2026-10-24 2차: 디자인·CRM·업무자동화·AI 프롬프트·성격·운세·부동산·유튜브·영상·이미지·네이버 메인 지침 초안 3종씩(30개) 추가 — 담당 세션 확인 전.
- 2026-10-24 인스타·쓰레드·이커머스·마케팅·데이터수집 카테고리 메인 지침 초안 3종씩(15개) 추가 — 담당 세션 확인 전. 카테고리 이름 「데이터수집|기획」→「데이터수집」 운영 DB 반영(마이그레이션 0045, slug 유지).
- 2026-10-24 운영 DB 반영 완료(카테고리 2개 신설·프로그램 12개 이동, 마이그레이션 0042).
- 2026-10-24 처음 작성(14개 기준, ✅1·△8·⚠5) → 같은 날 주인님 지시로 **실제 사이트 16개 기준으로 다시 분류**: 기능 기준 옮기기 제안 12개 프로그램, 신설 제안 2개(AI 프롬프트·성격·운세), 상태 ✅1·△8·⚠8·기타 1(Tools), 공개 프로그램 72개 모두 배치 확인(Claude Code 윈도우 `claude-win-dotori`).
