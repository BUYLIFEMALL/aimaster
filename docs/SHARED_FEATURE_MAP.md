# 기능별 프로그램 지도 (SHARED_FEATURE_MAP.md)

> 2026-10-17 주인님 지시로 만든 문서다. **다른 CLI가 프로그램을 개발·리뉴얼하기 전에 먼저 본다.**
> 같은 기능을 어느 프로그램이 어느 파일에서 쓰는지, 그 코드가 **기준 / 사본 / 각자 구현** 중 어디에 해당하는지를 기능별로 모았다.
> - 프로그램별 소개(기능·장단점·사용 순서)는 [`PROGRAM_CAPABILITY_MAP.md`](PROGRAM_CAPABILITY_MAP.md)를 본다.
> - 공용 기준 코드의 원칙·고치는 절차는 [`SHARED_MODULES.md`](SHARED_MODULES.md)를 본다.
> - 사본이 기준과 같은지는 `node scripts/check-shared-modules.mjs`로 검사한다.
>
> **고칠 때 규칙**: 「기준」만 고친다 → `--sync`로 사본에 반영한다 → **사본을 쓰는 프로그램을 모두** 빌드·테스트·배포하고 버전을 +0.01 올린다 → 완료 보고서에 프로그램별 과정과 결과를 남긴다.
> 「각자 구현」인 곳을 고칠 때는 같은 기능의 다른 프로그램도 함께 점검하고, 공용화 후보로 이 문서에 표시한다.
> 새 프로그램을 추가하거나, 기능이 공용화되거나, 파일이 바뀌면 같은 작업(같은 커밋)에서 이 문서를 갱신한다(추가만, 덮어쓰기 금지).

상태 표시: **🟢 기준** · **🔵 사본**(기준과 같은 파일, 직접 고치지 않음) · **⚪ 각자 구현**(공용화 전) · **⛔ 대상 아님**

---

## 1. 유튜브 데이터 조회 — 공용 모듈 `youtube-data-client` (2026-10-17 1·2단계 완료, 사본 7곳)

회원 본인 YouTube API 키로 정보를 읽는 호출(검색·영상·채널·재생목록·댓글 읽기). 시간 제한·일시 오류 재시도·키 가리기·한도/분당 제한 구분 안내·할당량 계산을 공용 모듈이 맡는다.

| 프로그램 | 파일 | 상태 | 비고 |
|---|---|---|---|
| youtube-channel-consultant | — | ⚪ 병합됨 | 2026-10-20 YOUTUBE 트렌드 분석으로 병합, 옛 주소 전달만(기준은 아래 youtube-viral-studio로 이동) |
| youtube-viral-studio | `src/lib/youtube/youtubeData.ts` (+ `tests/youtubeData.test.mjs`) | 🟢 기준 | 2026-10-20 병합 C로 기준 이동. `client.ts`·`trendingVideos.ts`·`viralShorts.ts`·`sourceFinder.ts`와 옮겨 온 진단 코드 `lib/consultant/youtube/client.ts`가 위임 (v1.21) |
| shorts-viral-studio | `src/lib/youtube/youtubeData.ts` | 🔵 사본 | `api.ts` `ytFetch()`가 위임, 오류 종류(kind) 변환 (v1.10) |
| ai-auto-blog | `utils/ai/youtubeData.ts` | 🔵 사본 | `utils/ai/youtubeShorts.ts`가 위임 (v1.68, 2026-10-17 2단계) |
| tistory-auto-blog | `utils/ai/youtubeData.ts` | 🔵 사본 | `utils/ai/youtubeShorts.ts` (ai-auto-blog와 같은 내용)가 위임 (v1.75, 2026-10-17 2단계) |
| threads-content-ops | `lib/youtubeData.ts` | 🔵 사본 | `lib/youtubeShorts.ts`가 위임 (v1.99, 2026-10-17 2단계) |
| naver-blog-agent | `src/lib/youtubeData.ts` | 🔵 사본 | `src/lib/collector.ts` (쇼츠 검색 부분)가 위임 (v1.88, 2026-10-17 2단계) |
| trending-product-finder | `lib/youtube/youtubeData.ts` | 🔵 사본 | `lib/youtube/client.ts`가 위임 (v1.14, 2026-10-17 2단계) |
| shots | `src/lib/youtube/client.ts` | ⛔ 대상 아님 | 로그인 연동(OAuth) 업로드 |
| youtube-auto-reply | `lib/youtube/client.ts` | ⛔ 대상 아님 | 로그인 연동(OAuth) 댓글 쓰기 |
| threads-content-ops | `app/threads-content-ops/web-actions.ts`, `desktop/src/main/providers/youtube.ts` | ⛔ 대상 아님 | OAuth 업로드 / 데스크톱 앱(Electron) |

## 2. 황금·공략 채널 찾기 — 공용 모듈 `youtube-golden-engine` (2026-10-17 완료)

| 프로그램 | 파일 | 상태 | 비고 |
|---|---|---|---|
| youtube-channel-consultant | — | ⚪ 병합됨 | 2026-10-20 YOUTUBE 트렌드 분석으로 병합 |
| youtube-viral-studio | `src/lib/youtube/goldenEngine.ts` (+ `tests/goldenEngine.test.mjs`) | 🟢 기준 | 「황금·공략 채널 발굴」 하나로 (2026-10-20 병합 C로 기준 이동, v1.21) |

## 3. AI 이미지 생성 호출 — 공용 모듈 `gemini-image-client` (2026-10-17 1단계 완료, 모델 기준은 ai-image-studio)

모델·엔드포인트·호출 방식·이미지 받아오기의 기준은 **ai-image-studio `lib/providers/adapters/`**(루트 `CLAUDE.md` 「이미지 생성 레퍼런스 규칙」). 각 프로그램의 호출 코드는 아직 각자 구현이며, 2026-10-17에 44곳의 모델 값만 일괄 교체했다(`IMAGE_MODEL_AUDIT_20261017.md`). **프롬프트 내용·스타일은 공용화하지 않는다**(`IMAGE_PROMPT_RULES.md`).

| 묶음 | 프로그램 · 파일 | 상태 |
|---|---|---|
| 기준 | ai-image-studio · 호출 모듈 `lib/providers/geminiImage.ts`(+ `tests/geminiImage.test.mjs`) · 어댑터 `lib/providers/adapters/{gemini,openai,replicate,fal}.ts`·`registry.ts` | 🟢 기준(v1.13) — 호출·대기·이미지 받아오기 |
| 나노바나나 설정 파일 계열 (1단계 적용) | ai-auto-blog(장면·편집기 이미지) v1.69 · tistory-auto-blog v1.76 · naver-blog-seo-studio v1.67 · naver-blog-auto-poster_app v1.07 · naver-blog-auto-poster_web v1.08 · shots v1.11 · blog_auto_poster — 각 폴더 `geminiImage.ts` | 🔵 사본 — 호출(`geminiImage.ts`)과 모델 목록(`nanoBananaConfig.ts`/`nanoBananaModels.ts` → 공용 `gemini-image-models`, 2026-10-17 주인님 지시로 통합) 모두 |
| SNS 생성기 내장형 (2단계 적용) | insta_auto_poster v1.18 · threads v1.12 · threads-affiliate-poster `generator.ts` v1.57 · naver-cafe-poster v1.11 · naver-blog-agent `withGemini` v1.89 · naver-blog-allinone `blog/gemini.ts` v1.44 · threads-content-ops `lib/postImage.ts` v2.00 — 각 폴더 `geminiImage.ts`·`nanoBananaModels.ts` | 🔵 사본(호출+모델 목록) |
| 인스타 예약 게시(게시 처리·예약 API·회원 실행 방식) | 기준 insta_auto_poster `src/lib/cardnews/`(`memberScheduler.ts`·`cronJobOrg.ts`·`schedule.ts`, 2026-10-20 카드뉴스 병합으로 cardnews-studio에서 이동) + ai-webtoon-studio(`posting.ts`·`api/instagram/*` 4개) · 사본 ai-influencer-studio · four-cut-comics(카드뉴스 게시 처리는 구조가 달라 자체) — 값은 각 `schedulerConfig.ts` | 🔵 사본(`docs/SHARED_MODULES.md` insta-*) |
| 남은 것 | threads-affiliate-poster `imageGenerator.ts`(다중 플랫폼 생성기) | ⚪ |
| 단일 주소 상수형 (3묶음 적용) | kakao_auto_poster `reportImage.ts` v1.12 · stepmail `emailImage.ts` v1.12 · auto-detail-page `api/generate-image` v1.09 · tarot `api/generate-card-image` v1.09 · mbti-character `api/generate-character-image` v1.10 · music `nanobanana.ts` v1.12 (+ ai-auto-blog·tistory `editorImage.ts`는 1단계) — 각 폴더 `geminiImage.ts`·`nanoBananaModels.ts` | 🔵 사본 |
| 직접 호출형 (4묶음 A 적용) | cardnews-studio v1.11 · style-dna-analyzer v1.18 · shop-detail-page v1.11 · blog-content-maker v1.06 · blog-workroom v1.08 · music-video-studio v1.07 · emotion-writer v1.11 · photo-remake-studio v1.05 · shorts-onestop-studio v1.15 · seo-thumbnail-pro v1.06 — 각 폴더 `geminiImage.ts`·`nanoBananaModels.ts`(모델 목록은 등급표에서 값만 가져오고 화면 이름·순서는 프로그램이 정함). 시간 제한이 150초 이상이거나 중복 과금 방지 설계인 곳(shop-detail·photo-remake·shorts-onestop·blog-content-maker·blog-workroom)은 `retries: 0` | 🔵 사본 |
| SDK 사용형 (4묶음 B 적용, 2026-10-18) | playlist-channel-studio v1.14(Gemini 부분) · four-cut-comics v1.10 · thumbnail-master v1.06 · portrait-photo v1.21 · banana-canvas v1.07 · fashion-style v1.08 · allinone-graphic v1.07 · cinematic-storyboard-studio v1.09 · ai-influencer-studio v1.11 — 각 `src/lib/geminiImage.ts`·`nanoBananaModels.ts`(글 생성은 SDK 그대로) | 🔵 사본 |
| 옛 Imagen에서 바꾼 곳 (5묶음 적용, 2026-10-18) | yt-playlist-studio v1.13 `api/generate-bg` · ai-webtoon-studio v1.12 `imageGen.ts`(브라우저) · ebook-studio v1.08 `api/ai/cover` · detail-page-12p v1.08 `detailEngine.ts` · vinyl-lp-studio v1.11 `api/generate-artwork` — 각 `src/lib/geminiImage.ts`·`nanoBananaModels.ts` | 🔵 사본 |

## 4. 외부 데이터 수집(스크래핑·RSS·검색) — 공용화 후보

주소 안전 검사(SSRF 차단)·시간 제한·본문 추출·오류 처리를 공용화할 영역. 보안 교훈: `ERROR_LESSONS.md` 2026-10-16 website-scraper.

| 계열 | 프로그램 · 파일 | 상태 |
|---|---|---|
| AI 3종 수집기(HTTP·RSS·Perplexity) | ai-auto-blog `utils/ai/collector.ts` · tistory-auto-blog `utils/ai/collector.ts` · threads `src/lib/ai/collector.ts` · insta_auto_poster `src/lib/ai/collector.ts` · shots `src/lib/ai/collector.ts` · naver-cafe-poster `src/lib/ai/collector.ts` · kakao_auto_poster `src/lib/ai/collector.ts` · threads-content-ops `lib/collector.ts` · naver-blog-agent `src/lib/collector.ts` | ⚪ 9곳이 비슷한 수집기 → 공용화 후보(`PLATFORM_PATTERNS.md` AI 3종 수집) |
| 크롤러·스크래퍼 | website-scraper · web-crawler-saas · ghost-scraper `api/crawl` · competitor-analysis `lib/ai/research.ts` · real_estate_sales `lib/ai/sentiment.ts` | ⚪ (website-scraper가 SSRF 대책이 가장 앞섬 — 기준 후보) |
| 데스크톱 | threads-content-ops `desktop/src/main/providers/blog.ts` | ⛔ Electron |

## 5. AI 프롬프트 공통 규칙(당해 연도·한국 시간 현재 월·한국인 기본) — 공용화 후보

핵심 원칙 3(한국인 기본)·8(당해 연도) 문장을 프로그램마다 따로 넣고 있다. 공용화 범위는 **공통 규칙 문장과 조립 함수(틀)까지**이고 프로그램별 컨셉·스타일 문장은 각자 둔다.

| 형태 | 프로그램(예) | 상태 |
|---|---|---|
| 별도 규칙 파일 | threads-content-ops `lib/yearRule.ts` · ai-auto-blog `utils/news/promptRules.ts`(`buildYearRule`·`koreaNowRule`) · prompt-template-studio `lib/koreaNowRule.ts` | ⚪ 기준 후보 |
| 프롬프트 안에 직접 | 약 38개 프로그램(예: youtube-channel-consultant `lib/ai/prompts.ts`, naver-blog-agent `lib/ai/pipeline.ts`, shorts-onestop-studio `lib/prompts.ts`, cardnews-studio `copyPrompts.ts` …) — 검색: `기준 연도 엄수|buildYearRule|koreaNowRule` | ⚪ |

## 7. 브라우저 안 얼굴 인식(머리 위치·사진 품질) — 공용화 후보 (2026-10-19 등록)

회원 PC 브라우저 안에서 Google MediaPipe FaceLandmarker(얼굴 점 478개)로 얼굴을 찾는다. **사진을 서버로 보내지 않고 AI 호출·비용이 없다.** 지금은 인물사진 한 곳에서만 쓰며, 아래 프로그램에서 재사용할 만하다.

| 구분 | 위치 · 내용 | 상태 |
|---|---|---|
| 기준 후보 | `portrait-photo/src/lib/portrait/faceLocal.ts`(동적 불러오기·실패 시 재시도, `detectHeadLocal`·`checkPhotoLocal`) + `post.ts`의 순수 함수 `landmarksToMeasure`(턱 152·이마 10·볼 234/454, 정수리 α=0.42)·`largestFace`·`assessFaces`(얼굴 없음·여러 사람·작은 얼굴·옆모습·기울어짐)·`overlayY` + 정적 파일 `public/mediapipe/`(`face_landmarker.task` 3.7MB, `wasm/vision_wasm_internal.*`·`vision_wasm_nosimd_internal.*`) | 🟢 인물사진 v1.26~v1.27 운영 |
| 쓸 만한 곳 | four-cut-comics(캐릭터 참고 사진이 정면·한 사람인지 생성 전 점검) · ai-influencer-studio(컷마다 같은 얼굴인지 얼굴 점 비교로 일관성 점검) · ai-webtoon-studio(캐릭터 시트 점검) · photo-remake-studio·fashion-style(업로드 사진 점검) | ⚪ 각 프로그램 `docs/IMPROVEMENTS.md`에 제안 기록 |
| 공용화할 때 주의 | ① 라이브러리 `@mediapipe/tasks-vision` **1.0.0 고정**(버전을 올리면 wasm 파일도 함께 다시 복사) ② 모델·실행 파일 약 15MB를 각 프로그램 `public/`에 정적 배포(첫 사용 때만 내려받고 브라우저 캐시) ③ 정수리는 비율 추정이라 머리 모양에 따라 오차 — 출처 표시·직접 수정 수단을 함께 둘 것 ④ 얼굴 일관성 비교는 별도 함수가 필요(현재 미구현) | — |

## 8. OpenAI 모델별 요청 규칙 — 공용 모듈 `openai-request-params` (2026-10-20 등록, 사본 8곳)

OpenAI 추론 모델(GPT-5·GPT-6·o 계열)은 `temperature` 지정과 `max_tokens`를 거부(400)한다. **모델 목록에 새 모델을 넣었으면 `node scripts/check-openai-models.mjs`(호출 없이 목록·보낼 옵션·마지막 시험 결과) → `OPENAI_API_KEY=<본인 키> node scripts/check-openai-models.mjs --live`(시험 안 한 모델만 1회씩, 결과 `scripts/data/openai-model-check.json` + `docs/HANDOFF.md` 맨 위 한 줄 자동 기록 — `--no-handoff`로 끔, 키 오류 401이면 기록 없이 멈춤, 오류 문구의 키 조각은 가림)로 회원보다 먼저 확인한다. 커밋 직전 훅(`scripts/git-hooks/pre-commit`, 설치 `node scripts/git-hooks/install.mjs` — 윈도우 저장소에 2026-10-20 설치, `.git`을 함께 쓰는 맥미니도 적용)이 이번 커밋에 시험 안 한 모델 이름이 추가되면 경고만 띄운다(커밋은 막지 않음). 키 없이 남은 모델만 보기: `node scripts/check-openai-models.mjs --new`.** 회원이 모델을 고르는 OpenAI 호출은 요청 본문에 `...openAIGenerationParams(model, { temperature, maxTokens })`를 펼쳐 넣는다. 새 세대 모델 규칙이 바뀌면 기준 한 곳만 고친다.

| 구분 | 위치 · 내용 | 상태 |
|---|---|---|
| 기준 | `naver-blog-seo-studio/lib/ai/openaiRequestParams.ts` (+ `tests/openaiRequestParams.test.mjs`) | 🟢 기준(v1.77) |
| 사본 | `threads-affiliate-poster/src/lib/ai/openaiRequestParams.ts` | 🟢 적용(v1.68) |
| 사본(2026-10-20 적용, **미배포** — 각 프로그램 다음 배포 때 나감) | `style-dna-analyzer/src/lib/ai/openaiRequestParams.ts` · `cardnews-studio/src/lib/ai/openaiRequestParams.ts` · `naver-blog-allinone/src/lib/blog/openaiRequestParams.ts` · `naver-blog-agent/src/lib/ai/openaiRequestParams.ts` · `ai-auto-blog/utils/ai/openaiRequestParams.ts` · `tistory-auto-blog/utils/ai/openaiRequestParams.ts` · `threads-content-ops/lib/openaiRequestParams.ts` | 🟡 저장소 반영 |
| **화면 안내 붙일 곳(주인님 결정 2026-10-20: 한꺼번에 배포하지 않고 각 프로그램을 다른 이유로 고칠 때 함께)** — 모델 선택 칸 아래에 「모델 성격: {openAIModelBadge(model)} ⓘ」(`<details>`+`title`=`openAIModelTierHint`) + `openAIModelNotice` 한 줄. 기준 구현: naver-blog-seo-studio `components/studio/TitleView.tsx`, threads-affiliate-poster `src/components/posts/ProductPostForm.tsx` | style-dna-analyzer `src/app/(dashboard)/analyze/page.tsx · test/page.tsx` · cardnews-studio `src/components/studio/ui.tsx · src/app/(dashboard)/background/page.tsx` · naver-blog-allinone `src/components/blog/ModelSettingsCard.tsx` · naver-blog-agent `src/app/(dashboard)/page.tsx` · ai-auto-blog `app/write/ai-form/page.tsx` · tistory-auto-blog `app/write/ai-form/page.tsx` · threads-content-ops `app/threads-content-ops/AttentionComposer.tsx` | ⚪ 대기 |
| 제외 | youtube-channel-consultant `src/lib/ai/llm.ts` — 테스트가 이 파일을 Node로 바로 불러오도록 import 없이 만든 구조라, 사본을 넣으려면 tsconfig(`.ts` 확장자 import)까지 바꿔야 함. 기존 `gpt-4` 방어 코드로 정상 동작 · shorts-viral-studio — OpenAI에 온도를 보내지 않아 해당 없음 | ⚪ 해당 없음 |

## 9. 프로그램 공지 띠 — 공용 모듈 `program-notice-banner` (2026-10-20 등록)

메인 사이트 관리자가 공지의 「관련 프로그램」에 고른 프로그램 작업 화면 맨 위에 최근 공지 1건(30일 이내)을 띄운다. 호출 `<ProgramNoticeBanner programSlug="…" tone="dark|light" />`(화면 밝기에 맞게). 사본 추가는 `scripts/check-shared-modules.mjs`의 `copies`에 경로 → `--sync` → 레이아웃 `<main>` 맨 위. 필요: `lucide-react`, `@/lib/supabase/client`의 `createClient`. DB 형식 정의(`Database`)에 `programs`·`notices`가 없는 프로그램에서도 타입 검사가 통과하도록 기준 코드는 형식 정의 없이 조회한다(2026-10-20).

| 프로그램 | 파일 | 상태 | 비고 |
|---|---|---|---|
| ai-webtoon-studio | `src/components/ProgramNoticeBanner.tsx` | 🟢 기준 | v1.24 첫 적용(형식 보완은 다음 배포 때) |
| instagram-comment-reply | `components/ProgramNoticeBanner.tsx` | 🔵 사본 | v1.24, dark |
| threads-comment-reply | `components/ProgramNoticeBanner.tsx` | 🔵 사본 | v1.15, dark |
| youtube-auto-reply | `components/ProgramNoticeBanner.tsx` | 🔵 사본 | v1.20, dark |
| kakao_auto_poster | `src/components/ProgramNoticeBanner.tsx` | 🔵 사본 | v1.29, light |
| insta_auto_poster | `src/components/ProgramNoticeBanner.tsx` | 🔵 사본 | v1.42, dark |
| 나머지 웹 서브프로그램 | — | ⚪ 다음 배포 때 | `docs/SHARED_MODULES.md` 미배포 목록 |

## 10. 텔레그램 승인 봇 연동(`lib/telegram/client.ts`) — 공용화 후보 (2026-10-20 등록)

같은 구조의 파일이 9개 프로그램에 각자 복사돼 있다(공용 점검 스크립트 미등록). 연동 확인 `findChatIdFromUpdates`는 `deleteWebhook` → `getUpdates` 순서이며, **`getUpdates`에 `allowed_updates=["message"]`를 꼭 지정**해야 한다(웹훅에 `["callback_query"]`를 걸었던 봇은 텔레그램이 그 값을 기억해 일반 메시지를 버림 — `docs/ERROR_LESSONS.md` 2026-10-20). 봇 하나에는 웹훅 하나만 걸리므로 한 프로그램에 승인 기능이 둘이면 봇도 둘(예: INSTA 댓글·DM의 댓글 봇·DM 봇, `user_telegram_links.program_slug`로 구분).

| 프로그램 | 웹훅 사용 | allowed_updates 수정 |
|---|---|---|
| instagram-comment-reply(댓글 `lib/telegram/`·DM `lib/dmApp/telegram/`) | 예(버튼) | ✅ v1.21, 실패 진단 v1.22 |
| threads-comment-reply · youtube-auto-reply · kakao_auto_poster | 예(버튼) | ✅ v1.14 · v1.19 · v1.28 배포 |
| booking-reminder · crm-google-form · longtail-keyword-expander · real_estate_sales · trending-product-finder | 아니오(알림만) | 🟡 코드 반영, 다음 배포 때 |

공용화하면 좋은 점: 위 수정·실패 진단(`telegramDiagnosis`, instagram-comment-reply v1.22)을 한 번에 전파. 기준 후보: instagram-comment-reply `lib/telegram/client.ts` + `lib/actions/telegram.ts`의 진단 함수.

## 6. 공통 기반(이미 같은 구조로 복사해 쓰는 것)

| 기능 | 기준 위치 | 비고 |
|---|---|---|
| 이용 권한 판정 | 루트 `lib/access/checkProgramAccess.ts`, 각 프로그램 `lib/access.ts` | 판정 순서는 루트 `CLAUDE.md` 「이용 권한 판정 정책」. 아직 검사 스크립트 미등록 |
| 회원 본인 API 키 | 공용 `user_api_keys` + 각 프로그램 `apiKeys.ts` | 폴백 금지 |
| Supabase 키 이름 호환 | 각 프로그램 `lib/supabase/*` | `SUPABASE_API_KEY_COMPATIBILITY.md` |
| 로그인 쿠키 공유(SSO) | 각 프로그램 `lib/supabase/cookieDomain.ts` | `DOMAIN_SSO_POLICY.md` |

---

## 변경 이력

| 날짜 | 내용 | 작업 |
|---|---|---|
| 2026-10-20 | 병합 C: 유튜브 조회·황금 엔진 기준을 youtube-channel-consultant → youtube-viral-studio로 이동 | Claude Code(윈도우) |
| 2026-10-20 | 「9. 프로그램 공지 띠」(`program-notice-banner`, 사본 5곳)·「10. 텔레그램 승인 봇 연동」(공용화 후보, allowed_updates 함정) 등록 | Claude Code(윈도우) |
| 2026-10-20 | `openai-request-params` 사본 7곳 추가(미배포), youtube-channel-consultant 제외·shorts-viral-studio 해당 없음 | Claude Code(윈도우) |
| 2026-10-20 | 「8. OpenAI 모델별 요청 규칙」 `openai-request-params` 등록 — 기준 naver-blog-seo-studio v1.77, 사본 threads-affiliate-poster v1.68, 바꿀 후보 9곳 | Claude Code(윈도우) |
| 2026-10-19 | 「7. 브라우저 안 얼굴 인식」 공용화 후보 등록(기준 후보 portrait-photo v1.27, 사본 없음) | Claude Code(윈도우) |
| 2026-10-18 | threads-affiliate-poster `imageGenerator.ts`(다중 엔진 생성기) Gemini 부분 사본 적용 — 이미지 공용화 대상 모두 완료 | Claude Code(윈도우) |
| 2026-10-18 | 이미지 5묶음 Imagen 교체분 5곳 사본 적용(오류마다 다른 모델로 재요청하던 2곳 정리) | Claude Code(윈도우) |
| 2026-10-18 | 이미지 4묶음 B SDK 사용형 9곳 사본 적용(시간 제한·최종 이미지 선택·오류 구분) | Claude Code(윈도우) |
| 2026-10-18 | 이미지 시간 초과 안내를 Google 사용량 확인으로 정정 — 기준 + 사본 30곳 재배포 | Claude Code(윈도우) |
| 2026-10-18 | 이미지 시간 초과 자동 재시도 중단 — 기준 + 사본 30곳 재배포 | Claude Code(윈도우) |
| 2026-10-17 | 이미지 시간 초과 안내 문구 통일 — 기준 + 사본 30곳 재배포 | Claude Code(윈도우) |
| 2026-10-17 | 이미지 4묶음 A 직접 호출형 10곳 사본 적용 + 기준 갱신(최종 이미지 선택·사용량·취소 신호)으로 기존 사본 20곳 재배포 | Claude Code(윈도우) |
| 2026-10-17 | 이미지 3묶음 단일 주소형 6곳 사본 적용 | Claude Code(윈도우) |
| 2026-10-17 | 이미지 2단계 SNS 생성기 묶음 7곳 사본 적용 | Claude Code(윈도우) |
| 2026-10-17 | 이미지 모델 목록 통합 — gemini-image-models 기준(ai-image-studio)·사본 7곳 | Claude Code(윈도우) |
| 2026-10-17 | 이미지 생성 호출 1단계 — gemini-image-client 기준(ai-image-studio)·사본 7곳 | Claude Code(윈도우) |
| 2026-10-17 | 유튜브 조회 2단계 — ai-auto-blog·tistory-auto-blog·naver-blog-agent·threads-content-ops·trending-product-finder 사본 적용 | Claude Code(윈도우) |
| 2026-10-17 | 문서 신설. 유튜브 조회(1단계 3개 적용)·황금 채널 엔진 등록, 이미지·수집·프롬프트 규칙 후보 조사 | Claude Code(윈도우) |

## 2026-10-19 기능 안정화·점진 레퍼런스 모듈화와 아이디어 검토

당분간 기능 개선·안정화 우선입니다. 개선 중 검증된 기능을 레퍼런스로 정리해 신규 개발/리뉴얼 때 하나씩 적용합니다. 일괄 교체는 시작하지 않습니다. [확장 지도·경계·검증 기준](analysis-20261019/REFERENCE_MODULE_PROPOSAL.md), [아이디어 표·세 가지 검토 기준](PROGRAM_IDEA_BACKLOG.md)를 함께 읽습니다. 기존 공식 기준/사본 분류는 위 표를 따르며 신규 후보는 아직 기준으로 승격하지 않았습니다.
