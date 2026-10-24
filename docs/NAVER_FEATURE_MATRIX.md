# 네이버 기능 상세 비교표 (기준 문서)

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 「네이버」 전담 역할이 아직 없다. 담당 세션이 칸을 코드·화면과 대조해 확정하기 전까지는 참고 자료로만 쓴다.

> **네이버 카페·네이버 로그인·네이버 공식 API 기반 프로그램을 새로 만들거나 기능을 추가·확장·병합하기 전에 이 문서를 먼저 읽는다.** 네이버 블로그 글쓰기 기능은 [블로그 기능 상세 비교표](BLOG_FEATURE_MATRIX.md)가 기준이다.
>
> - 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`) — [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「네이버」 줄의 `naver-cafe-poster`와 관리자 전용 비공개 `naver-blog-auto-poster`·`naver-blog-auto-poster-web`.
> - 기준 시점: **2026-10-24**, 코드 버전(각 폴더 버전 파일) 카페 v1.28(`naver-cafe-poster/src/lib/version.ts`) · 블로그 App v1.12(`naver-blog-auto-poster_app/web/lib/version.ts`) · 블로그 Web v1.13(`naver-blog-auto-poster_web/web/lib/version.ts`, 확장 `extension/manifest.json` `version_name` v1.13).
> - 근거: 세 폴더의 현재 코드(파일 검색), 각 `AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/DETAILED_REVIEW_20261019.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드, [비공개 프로그램 병합 지도](HIDDEN_PROGRAMS_MERGE_MAP_20261022.md). **운영 DB·실제 화면은 이번에 확인하지 않았다**(공개 여부·버전은 비교표·병합 지도 기록 기준).
> - 이 문서는 **사실(지금 코드에 있는 것)** 만 적는다. 추천·계획은 [네이버 통합 작업표](NAVER_CONSOLIDATION_TASKS.md)에 둔다.
> - 관계 문서: [네이버 자동화 완성 기준](NAVER_COMPLETION_POLICY.md) · [네이버 편집기 자동 입력 지침](NAVER_BLOG_EDITOR_AUTOMATION_GUIDE.md) · [공용 네이버 엔진 제안](SHARED_NAVER_ENGINE_PROPOSAL_2026-10-10.md) · [공용 기능 지도](SHARED_FEATURE_MAP.md) · [공용 모듈 등록부](SHARED_MODULES.md).

## 0. 이 문서를 쓰는 법

1. **개발 전:** §2에서 만들려는 기능이 이미 있는지 찾는다. 있으면 §4의 기준 코드 위치를 읽고 가져다 쓴다(새로 짜지 않음).
2. **넣을 곳 판단:** 네이버 카페 게시는 `naver-cafe-poster`. 네이버 블로그 글쓰기는 블로그 카테고리 프로그램(블로그 비교표 참고). 비공개 두 블로그 앱에는 공개·병합 결정 전 새 기능을 넣지 않는다.
3. **개발 후(같은 커밋):** 바뀐 칸을 §2에서 고치고(칸에 버전 표시), 새 기준 코드는 §4에, 이력은 §6에 한 줄 추가한다. 배포 전 기능은 칸을 바꾸지 말고 작업표에 「미배포 대기」로 적는다.
4. 공용 문서라 `node scripts/safe-commit.mjs --begin docs/NAVER_FEATURE_MATRIX.md --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<메시지>" docs/NAVER_FEATURE_MATRIX.md --as <세션>`으로 커밋한다.

## 1. 프로그램 정의·장단점

| 약칭 | 프로그램 (slug · 버전 · 상태) | 역할 | 핵심 흐름 | 저장 / AI / 키 | 장점 | 단점·한계 | 판정 |
|---|---|---|---|---|---|---|---|
| 카페 | 네이버 카페 포스팅 자동화 (`naver-cafe-poster` v1.28 · 운영) | 네이버 카페 게시 **기준** | 회원 네이버 앱 → 네이버 로그인 → club_id·menu_id 등록 → URL·RSS·Perplexity 글감 → gpt-4o-mini 초안 → 초안 검수 → 즉시 게시 또는 정기 소스 자동 게시 | DB 표 `ncafe_*`(RLS 소유자) + 공개 버킷 `post-images` / OpenAI·Perplexity·Gemini / 회원 본인 키·본인 네이버 앱 | **공식 카페 API**(화면 조작 없음), 회원별 네이버 앱(BYOK), 정기 실행 방식 선택(Vercel·cron-job.org), 실행 직전 권한 확인, 「API키등록·플랫폼연동」 표준 기준 구현 | club_id·menu_id 직접 찾기, 글 수정·삭제 API 없음, 시각 지정 예약 없음, 게시 시간 초과 시 자동 재시도(중복 위험), 공개 버킷·30일 정리 없음, 당해 연도 주입 없음 | 독립(기준) |
| 블App | 네이버 블로그 자동화(App) (`naver-blog-auto-poster` v1.12 · 비공개) | 블로그 화면 입력 참고 구현(Playwright) | 웹에서 기기 연동 토큰 발급 → Windows Electron 앱 → 실제 크롬으로 네이버 글쓰기 화면에 제목·본문·이미지 입력 → 발행 레이어는 회원이 열고 태그·카테고리 입력 → 발행은 회원 | `personal_access_tokens` / 웹 `web/app/api/naver-blog-auto-poster/generate`가 회원 키로 생성 / 회원 본인 키 | 사람 속도 입력(`src/lib/humanInput.js`), 발행 버튼 절대 자동 클릭 안 함 | Windows 전용, 관리자 전용 비공개, 당해 연도 주입 없음 | 보존(병합 아님, 공개 결정 대기) |
| 블Web | 네이버 블로그 자동화(Web) (`naver-blog-auto-poster-web` v1.13 · 비공개) | 블로그 화면 입력 참고 구현(크롬 확장) | 확장 ZIP 설치 → 기기 연동 토큰 → 사이드패널에서 생성 → `chrome.scripting`으로 글쓰기 화면 입력 → 발행은 회원 | 같은 토큰 구조 / 웹 `web/app/api/naver-blog-auto-poster-web/generate` / 회원 본인 키 | 설치 없는 사이드패널, 태그·카테고리 2단계 입력 | 확장 덮어쓰기 설치, 관리자 전용 비공개, 당해 연도 주입 없음 | 보존(병합 아님, 공개 결정 대기) |

공통: 세 프로그램 모두 로그인 + 공통 권한 판정, 회원 본인 키(`user_api_keys`)를 쓴다. 비공개 두 앱은 [비공개 프로그램 병합 지도](HIDDEN_PROGRAMS_MERGE_MAP_20261022.md) 28·29줄 기준 「병합 아님 — 처음부터 관리자 전용 비공개」이며, 공개·병합 판단은 블로그 담당 결정 대기다.

## 2. 기능 상세 비교표

○ 있음 · △ 일부 · × 없음 · 「미확인」은 코드를 확인하지 못한 칸. 근거 경로는 각 프로그램 폴더 기준.

### 2-1. 계정·연동

| 기능 | 카페 | 블App | 블Web |
|---|---|---|---|
| 회원 본인 네이버 개발자 앱(Client ID/Secret) | ○ `src/lib/naver/account.ts` `resolveNaverAppCredentials` | × (네이버 API 안 씀 — 회원 크롬 로그인 세션 사용) | × (같음) |
| 네이버 로그인 OAuth + `state`=회원 id 검증 | ○ `src/app/api/naver/callback/route.ts`(`user.id !== state`) | × | × |
| 콜백 프로그램 권한 확인 + `dynamic`·`fetchCache` | ○ 같은 파일 `checkProgramAccessApi` | – | – |
| 토큰 만료 시 자동 갱신(갱신 토큰) | ○ `src/lib/naver/client.ts` `refreshNaverToken` | – | – |
| 공용 연동 표 저장(`member_platform_accounts` `naver_login`) | ○ v1.24 `src/lib/naver/memberAccount.ts` `saveSharedNaverAccount`·`getNaverAccount` | × | × |
| 기기 연동 토큰(웹 ↔ 앱/확장) | × | ○ `web/lib/personalAccessTokenAuth.ts` | ○ `web/lib/personalAccessTokenAuth.ts` |
| 「API키등록·플랫폼연동」 메뉴 + 📖 연동 매뉴얼 팝업 | ○ `src/components/layout/Sidebar.tsx` 66줄, `src/components/settings/GuideLinkButton.tsx` | 미확인 | 미확인 |
| 연동 & 사용 매뉴얼 `/guide` | ○ `src/app/(dashboard)/guide/page.tsx` | 미확인 | 미확인 |
| 회원 본인 AI 키만(폴백 없음) | ○ `src/lib/apiKeys.ts` `resolveApiKey` | △ `web/lib/apiKeys.ts` 존재(폴백 여부 미확인) | △ `web/lib/apiKeys.ts` 존재(폴백 여부 미확인) |

### 2-2. 글감·원고 생성

| 기능 | 카페 | 블App | 블Web |
|---|---|---|---|
| URL 글감 수집 | ○ `src/lib/ai/collector.ts` `fetchUrlText`, `src/lib/actions/candidates.ts` `collectFromHttpAction` | × | × |
| RSS(NewsBlur) 글감 | ○ `collector.ts` `fetchNewsblurStories`, `collectFromRssAction` | × | × |
| Perplexity 트렌드 글감(`sonar-pro`) | ○ `collector.ts` `searchPerplexityTrending` | × | × |
| 글감 카테고리 분류·관리 | ○ `src/lib/actions/categories.ts`, `src/components/candidates/CategoryManager.tsx` | × | × |
| AI 카페 초안(gpt-4o-mini, 어투·분량 옵션) | ○ `src/lib/ai/cafeGenerator.ts` `generateCafePostContent`, `src/lib/ai/tone.ts` | – | – |
| AI 수정 요청 | ○ `cafeGenerator.ts` `reviseCafePostContent` | 미확인 | 미확인 |
| CTA 문구+링크 덧붙이기 | ○ `cafeGenerator.ts` `appendCtaIfNeeded`, `publish-core.ts` `splitCta` | × | × |
| AI 블로그 원고 생성(서버, 회원 키) | – | ○ `web/app/api/naver-blog-auto-poster/generate/route.ts`, `web/lib/naverBlogAutoPoster/generate.ts` | ○ `web/app/api/naver-blog-auto-poster-web/generate/route.ts`, `web/lib/naverBlogAutoPoster/generate.ts` |
| 당해 연도 기준 프롬프트(`getFullYear` 주입) | × (`src/lib/ai/`에 없음) | × (`web/lib/naverBlogAutoPoster/`에 없음) | × (같음) |
| 대표 이미지(나노바나나, 공용 사본) | ○ `src/lib/actions/ai.ts` `generateCafeImageAction`, `src/lib/ai/geminiImage.ts`·`nanoBananaModels.ts` | ○ `web/lib/naverBlogAutoPoster/generateImage.ts`·`geminiImage.ts` | ○ 같은 이름 파일 |
| 이미지 프롬프트 인물 한국인 기본 | ○ `src/lib/ai/imageGenerator.ts` 48·95줄 | 미확인 | 미확인 |
| 이미지 직접 올리기·영상 링크 | ○ `src/components/posts/DraftItem.tsx`·`PostEditForm.tsx`(버킷 `post-images`) | 미확인 | 미확인 |

### 2-3. 게시·예약·결과

| 기능 | 카페 | 블App | 블Web |
|---|---|---|---|
| ⓐ 초안만 저장(게시는 회원) | ○ `src/lib/scheduledSource/engine.ts`(`auto_post` 꺼짐 → `draft`), `/drafts` | ○ 화면 입력까지만(발행 회원) `src/lib/naverBlogAutomation.js` | ○ `extension/sidepanel.js` |
| ⓑ 즉시 게시 | ○ `src/lib/actions/posts.ts` `deployDraftAction`·`saveAndDeployDraftAction` | × (발행 버튼 자동 클릭 안 함) | × |
| ⓒ 예약 — 주기형(정기 소스, 5분 확인) | ○ `src/lib/scheduledSource/dispatch.ts` `dispatchDueSources`, `src/lib/schedule.ts` `isScheduleDue`, `vercel.json` | × | × |
| ⓒ 예약 — 특정 글 시각 지정 | × (`ncafe_posts`에 예약 시각 칸 없음, `supabase/0001_naver_cafe_poster.sql`) | × | × |
| 정기 실행 방식 회원 선택(Vercel / 본인 cron-job.org) | ○ v1.21 `src/lib/scheduledSource/memberScheduler.ts`(공용 사본)·`schedulerConfig.ts`, `src/components/settings/SchedulerModePicker.tsx` | × | × |
| 회원 실행 주소(회원 토큰, DB엔 해시) | ○ `src/app/api/cron/dispatch-member/route.ts` | × | × |
| 비밀값 빈 값 401 | ○ v1.21 `src/app/api/cron/generate-and-post/route.ts` `isAuthorized` | – | – |
| 실행 직전 프로그램 이용 권한 확인 | ○ v1.22 `src/lib/programAccess.ts`, `dispatch.ts` `accessChecker` | – | – |
| 정기 실행 중복 방지(조건부 `last_run_at` 선점) | ○ v1.21 `dispatch.ts` | – | – |
| 일시정지·재개, 실패 시 상태 되돌리기 | ○ v1.23·v1.25·v1.27 `memberScheduler.ts`, `src/components/candidates/SchedulePublishingControl.tsx` | – | – |
| 게시 결과 기록(글 주소·원본 응답·실패 사유) | ○ `src/lib/posts/publish-core.ts` `extractArticleUrl`·`cafe_article_url`·`raw_response`·`error_message` | 미확인 | 미확인 |
| 이미지 실제 파일 첨부(`image[0]`) | ○ `src/lib/naver/client.ts` `createCafeArticle`·`fetchImageAsBlob` | ○ 화면 입력 | ○ 화면 입력 |
| 결과 불확실 시 자동 재게시 안 함 | × `publish-core.ts` `MAX_PUBLISH_ATTEMPTS = 2`(시간 초과도 재시도), 정기 실행 실패 시 `dispatch.ts`가 `last_run_at`을 되돌려 5분 뒤 새 글로 다시 실행 | – | – |
| 즉시 게시 서버 쪽 상태 확인(이미 게시·게시 중이면 거부) | △ `saveAndDeployDraftAction`·`updateDraftAction`은 확인, `deployDraftAction`은 확인 없음(버튼 `useFormStatus` 비활성만) | – | – |
| 게시된 글 수정 후 다시 게시(새 글로) | ○ `posts.ts` `updateAndRepublishPostAction`(API에 수정 없음 — 화면에서 안내) | – | – |
| 사람 속도 입력(§20) | – (공식 API) | ○ `src/lib/humanInput.js` | ○ `extension/sidepanel.js`(자기완결 함수) |

### 2-4. 데이터·보안

| 기능 | 카페 | 블App | 블Web |
|---|---|---|---|
| 회원별 표 + RLS 소유자 정책 | ○ `supabase/0001_naver_cafe_poster.sql`(accounts·targets·posts), `0002`(candidates), `0006`(scheduled_sources), `0009`(categories) | 미확인 | 미확인 |
| 회원 이미지·영상 비공개 저장(서명 주소) | × 공개 주소 `getPublicUrl`(`src/lib/actions/ai.ts` 156줄, `DraftItem.tsx` 178줄, `PostEditForm.tsx` 186·224줄) — 경로는 `{user_id}/…` | 미확인 | 미확인 |
| 생성 자료 30일 자동 정리 | × (정리 예약·코드 없음 — `vercel.json`은 정기 게시 하나뿐) | × 미확인(검색 결과 없음) | × 미확인(검색 결과 없음) |
| 사용 기록(`logProgramUsage`) | ○ `src/lib/access.ts` 100줄 | 미확인 | 미확인 |
| 휴대폰 폭 위쪽 접는 메뉴 | ○ v1.20(AGENTS 기록) — 코드 확인은 미확인 | 미확인 | 미확인 |

## 3. 비활성 2개 기능 이관 기록

**이관한 것: 없음.** 두 블로그 앱은 병합된 원본이 아니라 처음부터 관리자 전용 비공개다([병합 지도](HIDDEN_PROGRAMS_MERGE_MAP_20261022.md) 28·29줄). 그래서 「어디로 옮겼다」가 아니라 「무엇을 참고 구현으로 남겼다」를 적는다.

| 원본 기능 | 원본 위치 | 지금 쓰는 곳(참고·재구현) | 상태 |
|---|---|---|---|
| Playwright 네이버 편집기 입력 순서(프레임 → 편집 대상 → 포커스 → 입력 → 검증) | `naver-blog-auto-poster_app/src/lib/naverBlogAutomation.js` | [네이버 편집기 자동 입력 지침](NAVER_BLOG_EDITOR_AUTOMATION_GUIDE.md) §1 「Playwright 기준 구현」 | 참고 자료로 유지 |
| 사람처럼 클릭·타이핑 | `naver-blog-auto-poster_app/src/lib/humanInput.js` | [PLATFORM_PATTERNS §20](PLATFORM_PATTERNS.md) 참고 구현 | 참고 자료로 유지 |
| 크롬 확장 편집기 구조 분석 | `naver-blog-auto-poster_web/extension/sidepanel.js` | 편집기 지침 §1 「기존 Chrome 확장 구조 분석 도구」. 블로그 확장의 실제 기준은 `naver-blog-seo-studio/extension/` | 참고 자료로 유지 |
| 발행 버튼은 회원이 직접 | 두 앱 공통 | 블로그 계열 ⓐ 방식의 원형 | 블로그 담당이 세 방식 선택 적용 여부 판단 |
| 기기 연동 토큰(`personal_access_tokens.program_slug`) | 두 앱 `web/lib/personalAccessTokenAuth.ts` | 두 앱 각자(서로 공유 금지 — 각 `AGENTS.md` §0) | 유지 |

공개·병합·폐지 판단은 [블로그 통합 작업표](BLOG_CONSOLIDATION_TASKS.md)의 블로그 담당 결정이다. 폐지하게 되면 폴더를 지우기 전에 `D:\Antigravity\AIMaster_backup\retired-programs\`에 백업하고 git 태그를 남긴다.

## 4. 기능별 기준 코드 위치

| 기능 | 기준 코드 |
|---|---|
| 회원 본인 네이버 앱 자격 조회 | `naver-cafe-poster/src/lib/naver/account.ts` |
| 네이버 로그인·토큰 갱신·카페 글쓰기 API(multipart 이미지) | `naver-cafe-poster/src/lib/naver/client.ts` |
| 네이버 로그인 콜백(state·권한·캐시 차단) | `naver-cafe-poster/src/app/api/naver/callback/route.ts` |
| 공용 네이버 로그인 연결 읽기·쓰기 | `naver-cafe-poster/src/lib/naver/memberAccount.ts` + 공용 사본 `src/lib/memberIntegrations.ts` |
| 카페 본문 HTML 변환(`<br>`만, CTA 순수 URL) | `naver-cafe-poster/src/lib/posts/publish-core.ts` |
| 정기 실행(선점·권한 확인) | `naver-cafe-poster/src/lib/scheduledSource/dispatch.ts`·`engine.ts` |
| 회원 cron-job.org 예약 | 공용 기준 `insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts`(2026-10-20 `cardnews-studio`에서 이동, `scripts/check-shared-modules.mjs` `member-scheduler`) → 사본 `naver-cafe-poster/src/lib/scheduledSource/memberScheduler.ts`(직접 수정 금지), 프로그램 값 `schedulerConfig.ts` |
| 「API키등록·플랫폼연동」 설정 화면·매뉴얼 팝업 | `naver-cafe-poster/src/app/(dashboard)/settings/page.tsx`, `src/components/settings/GuideLinkButton.tsx` |
| 네이버 블로그 Playwright 입력(참고) | `naver-blog-auto-poster_app/src/lib/naverBlogAutomation.js`, `humanInput.js` |
| 네이버 블로그 크롬 확장 입력 | 블로그 비교표 기준(`naver-blog-seo-studio/extension/`) |

## 5. 문서와 코드가 다른 곳 (2026-10-24 발견)

| 문서 기록 | 실제 코드 | 처리 |
|---|---|---|
| `naver-cafe-poster/AGENTS.md` 머리 「현재 버전 v1.24」, `docs/IMPROVEMENTS.md` 「v1.20」 | `src/lib/version.ts` v1.28(프로그램 비교표도 v1.28) | 담당 세션이 AGENTS 머리·버전 이력(v1.26·v1.28 항목 없음)을 보완 |
| `naver-cafe-poster/AGENTS.md` 4단계 「cron 스케줄러를 통해 예약 발행」 | 특정 글 시각 지정 예약은 없고 정기 소스(주기형)만 있음 | 표현을 「정기 자동 생성·게시」로 정정 |
| `naver-cafe-poster/AGENTS.md` 「Google Gemini 2.5 Flash」 | 이미지 프롬프트 작성은 `gemini-2.5-flash`(`imageGenerator.ts` 29줄, 키를 주소 `?key=`로 전달), 이미지 생성은 나노바나나 공용 사본 | 기록 보완(키 머리글 전환 검토는 작업표) |
| `naver-blog-auto-poster_web/AGENTS.md` §0 「루트 API `app/api/naver-blog-auto-poster-web/*`」, 「`lib/naverBlogAutoPoster/*` 공유」 | 루트에 없음 — 각 폴더 `web/app/api/…`·`web/lib/naverBlogAutoPoster/`로 분리돼 있음(2026-10-15 루트 분리 이후) | 블로그 담당이 AGENTS §0 경로 정정 |
| `naver-cafe-poster/AGENTS.md` 맨 아래 「기준 `cardnews-studio/src/lib/instagram/memberScheduler.ts`」 | 지금 기준은 `insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts`(같은 날 이동, `docs/SHARED_MODULES.md` 115줄) | 기준 경로 정정 |
| `naver-cafe-poster/docs/DETAILED_REVIEW_20261019.md` D-31-01(`CRON_SECRET` 빈 값 통과) | v1.21에서 이미 수정(`generate-and-post/route.ts` `Boolean(secret)`) | 「처리됨」으로 표시 |

## 6. 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 세 폴더 코드 검색으로 기능 표 4묶음·비활성 이관 기록·기준 코드 위치·문서와 코드 차이 6건 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
