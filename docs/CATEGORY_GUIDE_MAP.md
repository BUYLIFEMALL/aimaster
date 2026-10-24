# 카테고리 지침 지도 (14개 카테고리 — 모든 CLI 공통)

> **2026-10-24 주인님 지시:** 「각각의 역할 및 카테고리 영역별 메인 지침을 보고 필요하면 보강하거나 수정할 수 있으면 개발 유지보수 업무에 효율성을 올릴 수 있을 것 같아」. 근거 플랜: [`PLAN_20261024_ADMIN_DEV_DOCS_CENTER.md`](PLAN_20261024_ADMIN_DEV_DOCS_CENTER.md) §2-2.
>
> **이 문서는 무엇인가:** 카테고리마다 「먼저 읽을 메인 지침 · 비교표·분석 보고서 · 기준(레퍼런스) 프로그램 · 담당 역할 · 관련 외부 분석」을 한 줄로 모은 지도다. **빈 곳은 「⚠ 보강 필요」로 표시**해, 어느 카테고리의 지침이 비어 있는지 바로 보이게 했다.
>
> **쓰는 법:** 어떤 프로그램을 작업하든 ① 아래 §1 공통 지침 ② 그 프로그램 카테고리의 §2 줄 ③ 그 카테고리 담당 역할 파일(`docs/roles/`) 순서로 읽는다. 카테고리 지침을 새로 만들거나 보강하면 같은 작업에서 이 지도의 그 줄을 고친다(여러 세션이 고치므로 [안전 커밋 도우미](CLI_COLLABORATION_RULES.md) 9번 사용).
>
> 작성: Claude Code(윈도우) `claude-win-dotori` `[역할: analysis-planning]`, 2026-10-24. 프로그램 목록은 [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 「개발 목록 요약 표」의 분야 칸 기준이다.

## 0. 상태 표시
| 표시 | 뜻 |
|---|---|
| ✅ 갖춤 | 그 카테고리 전용 메인 지침(완성 기준·규칙)과 비교표·분석이 모두 있음 |
| △ 일부 | 분석 보고서·대기 목록·매뉴얼은 있으나 **카테고리 전용 메인 지침이 없음** |
| ⚠ 보강 필요 | 전용 지침이 거의 없음(분석 보고서 1개 이하) |

## 1. 모든 카테고리 공통 지침 (카테고리와 상관없이 먼저)
| 주제 | 문서 |
|---|---|
| 최상위 규칙·대화 규칙 | 루트 [`CLAUDE.md`](../CLAUDE.md)(Codex는 `AGENTS.md`, Gemini는 `GEMINI.md`), [분야별 요약 색인](guidelines/README.md) |
| 회원 본인 계정·키 | [`TOP_RULE_PERSONAL_ACCOUNT_API.md`](TOP_RULE_PERSONAL_ACCOUNT_API.md), [회원 연동 공용 저장](MEMBER_INTEGRATIONS.md) |
| 공용 기준 코드 | [`SHARED_FEATURE_MAP.md`](SHARED_FEATURE_MAP.md), [`SHARED_MODULES.md`](SHARED_MODULES.md), [점검표](SHARED_MODULE_CHECKPOINTS.md) |
| 비교·병합 | [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md), [프로그램 비교 분석 매뉴얼](PROGRAM_COMPARISON_ANALYSIS_GUIDE.md), [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) |
| 예약 기능 | [`SCHEDULER_POLICY.md`](SCHEDULER_POLICY.md) |
| 크롬 확장 | [`EXTENSION_RELEASE_RULES.md`](EXTENSION_RELEASE_RULES.md) |
| 공식 API 없는 화면 자동화 | [`PLATFORM_PATTERNS.md`](PLATFORM_PATTERNS.md) §20(봇 탐지 회피·회원 선택 입력·발행 방식) |
| 디자인·매뉴얼 | [`DESIGN.md`](../DESIGN.md), [`PROGRAM_DESIGN_STANDARD.md`](PROGRAM_DESIGN_STANDARD.md), [`MANUAL_AND_INTEGRATION_GUIDELINES.md`](MANUAL_AND_INTEGRATION_GUIDELINES.md) |
| 비용·배포 | [`TEST_COST_POLICY.md`](TEST_COST_POLICY.md), [`VERCEL_COST_REDUCTION_PLAN.md`](VERCEL_COST_REDUCTION_PLAN.md) |
| 에러 교훈 | [`ERROR_LESSONS.md`](ERROR_LESSONS.md) |
| 역할별 현황 | [`roles/README.md`](roles/README.md) |

## 2. 카테고리별 지도

| 카테고리 | 상태 | 프로그램(운영 중 / 병합됨) | 메인 지침 | 비교표·분석 보고서 | 기준(레퍼런스) 프로그램 | 담당 역할 | 외부 분석 카드 | 보강할 것 |
|---|---|---|---|---|---|---|---|---|
| **블로그** | ✅ 갖춤 | `ai-auto-blog` `blog-content-maker` `blog-keyword` `blog-workroom` `naver-blog-agent` `naver-blog-allinone` `tistory-auto-blog` (+ 네이버 카테고리의 `naver-blog-seo-studio`) | [블로그 완성 기준](BLOG_AUTOMATION_COMPLETION_POLICY.md), [네이버 편집기 자동화](NAVER_BLOG_EDITOR_AUTOMATION_GUIDE.md), PLATFORM_PATTERNS §20 | [블로그 기능 상세 비교표](BLOG_FEATURE_MATRIX.md), [블로그 통합 분석](analysis-blog-consolidation-20261020/REPORT.md), [통합 작업표](BLOG_CONSOLIDATION_TASKS.md) | 기능별 기준 코드는 블로그 기능 비교표에 | `blog` | EXT-BLOG-01~06 | — |
| **유튜브** | △ 일부 | `auto-shorts-posting` `playlist-channel-studio` `shorts-onestop-studio` `shorts-viral-studio` `thumbnail-master` `youtube-auto-reply` `youtube-viral-studio` / 병합됨: `seo-thumbnail-pro` `youtube-channel-consultant` | ⚠ 전용 메인 지침 없음(로드맵만) | [유튜브 로드맵](YOUTUBE_AUTOMATION_ROADMAP.md), [유튜브 통합 분석](analysis-youtube-consolidation-20261020/REPORT.md), [카드형 쇼츠 참고 분석](CARD_SHORTS_REFERENCE_ANALYSIS.md) | 공용 `youtube-golden-engine`(채널 컨설턴트 기준) | 없음(영상 부분은 `video`, 음악 부분은 `music`) | EXT-YT-01~03, EXT-MUS-01·04 | 쇼츠·업로드·댓글 공통 규칙(유튜브 권한 범위·업로드 정책·수익화 주의)을 담은 메인 지침, 담당 역할 |
| **음악** | △ 일부 | `ai-audio-analyzer` `ai-mastering-studio` `ai-music-studio` `lyric-video-studio` `music-automation` `music-video-studio` `vinyl-lp-studio` / 병합됨: `suno-music-studio` `yt-playlist-studio` | ⚠ 전용 메인 지침 없음(대기 목록·플랜만) | [음악 통합 분석](analysis-music-consolidation-20261021/REPORT.md), [음악 스튜디오 플랜](analysis-music-studio-20261023/PLAN.md), [배경음악 공용화 플랜](analysis-music-studio-20261023/BGM_SHARED_PLAN.md), [음악 담당 대기 목록](MUSIC_OWNER_QUEUE_20261024.md) | `ai-music-studio`(음악 모델 연동 기준) | `music` | EXT-MUS-01~07, EXT-MM-01 | 음악 모델 연동 규칙(이미지의 ai-image-studio 규칙처럼)·상업 이용 조건 표시·배경음악 공용 규칙을 담은 메인 지침 |
| **이미지** | △ 일부 | `ai-image-studio` `banana-canvas` `cinematic-storyboard-studio` `emotion-writer` `fashion-style` `four-cut-comics` `image-convert-studio` `portrait-photo` `style-dna-analyzer` / 병합됨: `allinone-graphic` `photo-remake-studio` | [이미지 프롬프트 생성 규칙](IMAGE_PROMPT_RULES.md), 루트 CLAUDE.md 「이미지 생성 레퍼런스 규칙」, [이미지 모델 점검](IMAGE_MODEL_AUDIT_20261017.md) | [이미지 통합 분석](analysis-image-consolidation-20261021/REPORT.md) | `ai-image-studio`(이미지 모델 연동 기준) | `ecommerce-image` | EXT-IMG-01~05, EXT-MM-03 | 이미지 카테고리 기능 비교표(블로그 기능 비교표처럼) |
| **인스타** | △ 일부 | `ai-influencer-studio` `ai-webtoon-studio` `auto-instagram-posting`(폴더 `insta_auto_poster`) `instagram-comment-reply` / 병합됨: `cardnews-studio` `instagram-dm-reply` | ⚠ 전용 메인 지침 없음(사용 매뉴얼만) | [인스타 통합 분석](analysis-insta-consolidation-20261020/REPORT.md), [인스타 자동 포스팅 매뉴얼](INSTAGRAM_AUTO_POSTER_MANUAL.md), [회원 연동 4단계(인스타)](PLAN_20261020_MEMBER_INTEGRATIONS_STEP4_INSTAGRAM.md) | `auto-instagram-posting`(인스타 연결 `insta_accounts`를 한 번 연결 → 다른 프로그램이 재사용) | 없음 | EXT-INS-01 | 「모든 인스타 프로그램은 예약·즉시 게시 포함」 같은 완성 기준과 인스타 API 권한 범위를 담은 메인 지침, 담당 역할 |
| **쓰레드** | ⚠ 보강 필요 | `auto-threads-posting` `threads-affiliate-poster` `threads-comment-reply` `threads-content-ops` `threads-easy-planner` | ⚠ 없음 | [쓰레드 통합 분석](analysis-threads-consolidation-20261023/REPORT.md), 예약 기능 기준 구현 `threads-content-ops`([SCHEDULER_POLICY](SCHEDULER_POLICY.md)) | `threads-content-ops`(예약 기준) | 없음 | 없음 | 회원 본인 Meta 앱 등록 원칙(핵심 원칙 4 감사 이력)·Threads API 권한·게시 규칙을 담은 메인 지침, 담당 역할 |
| **이커머스** | △ 일부 | `shop-detail-page` `trending-product-finder` / 병합됨: `auto-detail-page` `detail-page-12p` | ⚠ 전용 메인 지침 없음 | [이커머스 통합 분석](analysis-ecommerce-consolidation-20261021/REPORT.md), [상세페이지 12P 매뉴얼](DETAIL_PAGE_12P_HANDOFF_MANUAL_2026-10-13.md) | `shop-detail-page` | `ecommerce-image` | 없음 | 상세페이지·상품 분석 공통 규칙(쇼핑 API·이미지 권리·광고 표기)을 담은 메인 지침 |
| **네이버** | △ 일부 | `naver-blog-seo-studio` `naver-cafe-poster` / 비활성: `naver-blog-auto-poster` `naver-blog-auto-poster-web` | [네이버 편집기 자동화](NAVER_BLOG_EDITOR_AUTOMATION_GUIDE.md), PLATFORM_PATTERNS §20 | [공용 네이버 엔진 제안](SHARED_NAVER_ENGINE_PROPOSAL_2026-10-10.md), [회원 연동 5단계(유튜브·카카오·네이버)](PLAN_20261020_MEMBER_INTEGRATIONS_STEP5_YT_KAKAO_NAVER.md) | 블로그 쪽은 블로그 기능 비교표 | `blog`(블로그 프로그램), 카페는 없음 | EXT-RE-01(네이버 부동산 — 부동산 카테고리) | 네이버 카페 자동화 규칙, 블로그 카테고리와 겹치는 부분 정리 |
| **마케팅(홍보)** | ⚠ 보강 필요 | `booking-reminder` `comment-inbox` `competitor-analysis` `stepmail` / 병합됨: `longtail-keyword-expander` | ⚠ 없음 | [마케팅 통합 분석](analysis-marketing-consolidation-20261023/REPORT.md), [애드센스 승인 매뉴얼](ADSENSE_APPROVAL_MANUAL.md) | 없음 | 없음 | EXT-MKT-01(랜딩 — 데이터수집·기획 카테고리) | 메일·알림 발송 규칙(수신 동의·발송 한도)·경쟁 분석 데이터 범위를 담은 메인 지침, 담당 역할 |
| **멀티미디어(영상 포함)** | △ 일부 | `infinite-loop-video` `music-player` `reverse-prompt` + 비교표 분류 「영상」 `ai-video-studio`, 「영상·GIF」 `video-to-gif` | ⚠ 전용 메인 지침 없음(플랜·로드맵만) | [무료 영상 렌더링 플랜](PLAN_20261023_FREE_VIDEO_RENDERING.md), [내 PC 고속 변환 로드맵](analysis-pc-renderer-20261024/ROADMAP.md) | `ai-video-studio`(영상 모델 연동·영상 합치기 기준) | `video`(영상), `music`(음악 플레이어) | EXT-MM-01~03 | 영상 모델 연동 규칙(이미지 규칙처럼)·브라우저/내 PC 렌더 선택 기준을 담은 메인 지침 |
| **CRM** | ⚠ 보강 필요 | `crm-google-form` `kakao-auto-posting` | ⚠ 없음 | [회원 연동 5단계(카카오 포함)](PLAN_20261020_MEMBER_INTEGRATIONS_STEP5_YT_KAKAO_NAVER.md) | 없음 | 없음 | 없음 | 개인정보(고객 연락처) 저장·삭제 규칙, 카카오 발송 정책을 담은 메인 지침, 담당 역할 |
| **부동산** | ⚠ 보강 필요 | `real-estate-sales`(폴더 `real_estate_sales`) | ⚠ 없음(공공 데이터 키 예외는 [최상위 규칙 문서](TOP_RULE_PERSONAL_ACCOUNT_API.md) §8) | 없음 | `real-estate-sales` | 없음 | EXT-RE-01 | 공공 데이터 키 예외·비공식 데이터 수집 금지(EXT-RE-01 판단)를 담은 메인 지침, 담당 역할 |
| **데이터수집·기획** | △ 일부 | `ai-prompt-studio` `ai-slide-builder` `ai-web-ui` `ai-writing-editor` `landing-architect` `markdown-studio` `prompt-template-studio` `ui-canvas` `web-crawler-saas` `website-scraper` / 병합됨: `persona-style-studio` | ⚠ 전용 메인 지침 없음 | [스크래핑 통합 분석](analysis-scraping-consolidation-20261021/REPORT.md)(비교 분석 매뉴얼의 기준 사례) | 없음 | `docbot-prompt`(`ai-prompt-studio`만) | EXT-MKT-01, EXT-TL-05·06·07·09·10 | 수집 범위(robots·약관)·기획 도구 공통 규칙을 담은 메인 지침, 담당 역할 |
| **Tools** | ⚠ 보강 필요 | `ai-doc-chatbot` `ai-task-planner` `document-translator` `ebook-studio` `file-merge` `mbti-character` `personality-code` `personality-suite` `tarot-reading` + 비교표 분류 「업무자동화」 `ai-work-workspace` | ⚠ 없음 | 없음 | 없음 | `docbot-prompt`(`ai-doc-chatbot`), `workspace`(`ai-work-workspace`) | EXT-TL-01~04·08 | 성격·심리 점검 안전 규칙(상표명·위기 안내 — EXT-TL-08 판단), 문서 도구 공통 규칙 |

## 3. 정리하면서 발견한 것 (담당 세션·비교표 담당 확인 필요)
- **카테고리 이름이 섞여 있다.** 프로그램 비교표 목록 표에는 공식 14개 외에 「업무자동화」(`ai-work-workspace`), 「영상」(`ai-video-studio`), 「영상·GIF」(`video-to-gif`), 「이미지(2026-10-21 이동)」(`cinematic-storyboard-studio`) 같은 분류가 있다. 이 지도에서는 가장 가까운 공식 카테고리(Tools·멀티미디어·이미지)로 묶었다. DB `programs`의 실제 카테고리와 맞는지 비교표 담당이 확인할 것.
- **전용 메인 지침이 있는 카테고리는 블로그 하나뿐이다.** 블로그는 「완성 기준 + 기능 비교표 + 통합 작업표」 세 가지를 갖춘 덕분에 담당이 바뀌어도 바로 이어서 병합·배포할 수 있었다(2026-10-24 SEO 스튜디오·에이전트·키워드 연속 배포). 다른 카테고리도 같은 세 가지를 갖추는 것이 이 지도의 보강 목표다.
- **담당 역할이 없는 카테고리**: 유튜브(일부)·인스타·쓰레드·마케팅·CRM·부동산·데이터수집·기획·Tools(일부). 주인님이 담당을 지정하면(2026-10-24 「담당을 지정하도록 할께」) [`roles/README.md`](roles/README.md)와 이 표의 「담당 역할」 칸을 고친다.

## 4. 카테고리 메인 지침을 만들 때의 양식 (블로그 기준)
카테고리 담당이 메인 지침을 새로 만들 때는 아래 세 문서를 기본으로 한다.
1. **완성 기준**(예: [블로그 완성 기준](BLOG_AUTOMATION_COMPLETION_POLICY.md)): 그 카테고리 프로그램이 「끝났다」고 말할 수 있는 조건, 회원이 고르는 항목, 하지 않을 것.
2. **기능 상세 비교표**(예: [블로그 기능 상세 비교표](BLOG_FEATURE_MATRIX.md)): 프로그램 × 기능 ○△× 표, 기능별 기준 코드 위치, 병합 방향, 확장 로드맵.
3. **통합 작업표**(예: [블로그 통합 작업표](BLOG_CONSOLIDATION_TASKS.md)): 병합·개선 묶음 번호, 진행 상태.
- 파일 이름은 `docs/<카테고리 영문>_COMPLETION_POLICY.md`·`_FEATURE_MATRIX.md`·`_CONSOLIDATION_TASKS.md`로 맞춘다(예: `MUSIC_FEATURE_MATRIX.md`). 만들면 이 지도의 그 줄 상태를 고친다.

## 변경 기록
- 2026-10-24 처음 작성 — 14개 카테고리 지도, 공통 지침 표, 보강 필요 표시(✅ 1 · △ 8 · ⚠ 5), 카테고리 메인 지침 양식(Claude Code 윈도우 `claude-win-dotori`).
