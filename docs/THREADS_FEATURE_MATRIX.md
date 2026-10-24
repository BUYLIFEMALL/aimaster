# 쓰레드 기능 상세 비교표 (기준 문서)

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 칸은 코드 검색으로 근거 파일을 찾은 것만 ○로 적었다. 실제 화면·실제 게시는 이 문서 작성에서 확인하지 않았다.
>
> **쓰레드 프로그램을 새로 만들거나 기능을 추가·확장·병합하기 전에 이 문서와 [쓰레드 완성 기준](THREADS_COMPLETION_POLICY.md)을 먼저 읽는다.**
>
> - 대상: ① AIMaster 운영 쓰레드 5개(DB ref `esgxyikcnnvmlhygjkth`).
> - 기준 시점: **2026-10-24**, 코드 버전 기획 v1.49 · 포스팅 v1.33 · 댓글 v1.28 · 쇼핑제휴 v1.84 · 운영 v2.20(각 폴더 `lib/version.ts` 또는 `src/lib/version.ts`의 `APP_VERSION`).
> - 근거: 5개 폴더 현재 코드(기능 파일 검색, `node_modules`·`KIT`·`desktop`·시험 파일 제외), [쓰레드 통합 분석](analysis-threads-consolidation-20261023/REPORT.md)(기준 HEAD `6b36c7f02`, §8 결정), git 이력.
> - 이 문서는 **사실(지금 코드에 있는 것)** 만 적는다. 추천·계획은 §6에 따로 두고, 실제 구현·배포 전에는 표의 칸을 바꾸지 않는다.
> - 관계 문서: 전체 비교는 [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md), 작업 목록은 [`THREADS_CONSOLIDATION_TASKS.md`](THREADS_CONSOLIDATION_TASKS.md), 완성 기준은 [`THREADS_COMPLETION_POLICY.md`](THREADS_COMPLETION_POLICY.md), 예약은 [`SCHEDULER_POLICY.md`](SCHEDULER_POLICY.md), 공용 코드는 [`SHARED_FEATURE_MAP.md`](SHARED_FEATURE_MAP.md)·[`SHARED_MODULES.md`](SHARED_MODULES.md).

## 0. 이 문서를 쓰는 법

1. **개발 전:** §2에서 만들려는 기능이 이미 어느 프로그램에 있는지 찾는다. 있으면 §4의 기준 코드 위치를 읽고 가져다 쓴다(새로 짜지 않음).
2. **넣을 곳 판단:** §1 역할과 §5 방향을 보고 그 기능이 「입문용 단순 게시(포스팅)」인지 「여러 계정 전문 운영(운영)」인지 「쇼핑 홍보(쇼핑제휴)」인지 「댓글 응대(댓글)」인지 「기획만(기획)」인지 정한다.
3. **개발 후(같은 커밋):** 바뀐 칸을 §2에서 고치고(칸에 버전 표시), 새 기준 코드는 §4에, 이력은 §7에 한 줄 추가한다. 배포 전 기능은 칸을 바꾸지 말고 §6에 「미배포」로 적는다.
4. 공용 문서라 `node scripts/safe-commit.mjs --begin docs/THREADS_FEATURE_MATRIX.md --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<메시지>" docs/THREADS_FEATURE_MATRIX.md --as <세션>`으로 커밋한다.

## 1. 프로그램 정의·장단점

| 약칭 | 프로그램 (slug · 폴더 · 버전) | 역할 | 핵심 흐름 | 저장 / AI / 키 | 장점 | 단점·한계 | 판정 |
|---|---|---|---|---|---|---|---|
| 기획 | Threads AI 기획 자동화 (`threads-easy-planner` · 같은 폴더 · v1.49) | 기획 전용 | 주제·업종·페르소나·사진/영상 → 주제 추천·글 생성·다시 쓰기 → 훅·본문·첫 댓글 질문·후속 주제 → 복사 | DB `tep_saved_plans`(30일) + 브라우저 사본 `tep_saved_plans_local_cache` / OpenAI·Claude·Gemini / 본인 키 | 훅 바꿔 끼우기, 사진·영상 분석 글쓰기, 요일·시간대 추천, 설치 키트(배포판 ALLA AI) | **Threads 게시 없음**, 브라우저 사본이 회원 구분 없는 키 하나, 모델 목록에 구형(`gpt-4o`·`claude-3-5-sonnet-latest`·`gemini-2.0-flash`) 남음, 이미지 기능은 운영에서 숨김(v1.49) | 독립 유지(주인님 10-23 결정) |
| 포스팅 | Threads 포스팅 자동화 (`auto-threads-posting` · `threads/` · v1.33 · FREE) | 입문용 기본형 | 글감 수집(웹 주소·NewsBlur·Perplexity) → 카테고리별 후보 → AI 초안 → AI 이미지·무료 사진 → 즉시·예약 게시 | DB(RLS) · 공개 버킷 `post-images` / 글 OpenAI(`gpt-4o-mini`)·수집 Perplexity·이미지 Gemini / 본인 키·본인 Meta 앱 | 메뉴가 적은 단순 흐름, NewsBlur·글감 카테고리는 여기만, 사진 키워드 사전 기준 | NewsBlur 비밀번호 평문 저장, 글 생성 AI 1사, 생성 지시문에 연도 주입 코드 못 찾음 | 독립 유지 |
| 댓글 | Threads 댓글자동화 (`threads-comment-reply` · 같은 폴더 · v1.28) | 댓글 응대 | 게시물 동기화 → 댓글 수집 → AI 답글 초안 → `pending_review` → 웹·텔레그램 승인 → 게시(자동 게시 선택) | DB `th_*`(RLS) + 공용 `user_telegram_links` / OpenAI·Claude·Gemini / 본인 키·본인 Meta 앱·본인 텔레그램 봇 | 사람 승인 중심, 텔레그램 버튼, 회원이 고르는 자동 수집(v1.26), INSTA·유튜브 댓글과 같은 구조 | 댓글·답글 30일 정리 코드 못 찾음 | 독립 유지 |
| 쇼핑제휴 | Threads 쇼핑제휴 자동화 (`threads-affiliate-poster` · 같은 폴더 · v1.84 · BEST) | 쇼핑 홍보 | 상품 등록(쿠팡·알리·토스·브랜드커넥트) → 네이버 데이터랩·검색·인기글 탐지 → 쇼핑 글·이미지 → 즉시·예약 게시 | DB + 캐시 2표 / 글 3사·이미지 Gemini·GPT Image·Replicate / 본인 키·본인 Meta 앱·본인 네이버 키 | 쇼핑 공시 문구, 상품 이미지 분석, 상세페이지 이미지 가져오기, Meta 삭제·해제 콜백 담당, 상품 연동 공용 기준 코드 | 네이버 검색·트렌드 캐시를 회원끼리 공유(캐시 표에 `user_id` 없음), 연도 주입 코드 못 찾음 | 독립 유지 |
| 운영 | Threads 콘텐츠 운영 자동화 (`threads-content-ops` · 같은 폴더 · v2.20 · 추천) | 여러 계정 전문 운영 · **예약 기준 구현** | 계정 여러 개·운영 프로필 → 떡상 글감(웹·Perplexity·유튜브 쇼츠) → 훅·본문·CTA 초안·사진/영상 분석 → 보관함 → 즉시·예약 게시, 쇼핑 상품 등록 | DB `tco_*`(RLS) · 버킷 `threads-content-ops-media` / 글 3사·이미지 / 본인 키·본인 Meta 앱 | 가장 큰 통합판, 중복 게시 방지·끊김 정리, 30일 정리, 기획 기능 이식(v2.15), 무료 사진(v2.17), 데스크톱 앱·설치 키트 | 메뉴가 많아 입문자에게 어려움, 웹에는 댓글 답글 없음(데스크톱 앱만), NewsBlur·RSS 없음 | 독립 유지(기준) |

공통: 5개 모두 회원 본인 키·공용 권한 판정을 쓴다. 게시하는 4개(포스팅·댓글·쇼핑제휴·운영)는 회원 본인 Meta 앱(`app_secret` 회원 등록)과 공용 `member_platform_accounts` 연결을 쓴다. 권한 회원·사용 기록 수는 [통합 분석 §1](analysis-threads-consolidation-20261023/REPORT.md) 참조(10-23 읽기 전용 조회).

## 2. 기능 상세 비교표

○ 있음 · △ 일부 · × 없음(코드 검색에서 못 찾음) · 「미확인」은 근거를 확정하지 못한 칸 · 괄호 안 버전은 들어간 버전.

### 2-1. 글감·자료

| 기능 | 기획 | 포스팅 | 댓글 | 쇼핑제휴 | 운영 |
|---|---|---|---|---|---|
| 웹 주소 읽기(cheerio) | × | ○ | – | × | ○ |
| RSS 구독 피드 | × | △ NewsBlur 계정 피드만 | – | × | × (NewsBlur 제외 명시) |
| AI 트렌드 검색(Perplexity) | × | ○ | – | × | ○ |
| 유튜브 쇼츠 글감 | × | × | – | × | ○ |
| 네이버 데이터랩 트렌드 | × | × | – | ○ | × |
| 네이버 뉴스·블로그·카페 검색 | × | × | – | ○ | × |
| Threads 인기글(키워드 검색 API) | × | × | – | ○ `keyword_search`(앱 심사 전 본인 글만) | × |
| 떡상 글감 수집·카테고리 관리 | × | △ 글감 카테고리 | – | △ 인기글 탐지 | ○ |
| AI 주제 추천 | ○ | △ 후보 생성 | – | × | ○ |
| 요일·시간대 추천 주제 | ○ | × | – | × | ○ (v2.15) |
| 사진·영상 분석 글쓰기 | ○ | × | – | △ 상품 이미지 분석 | ○ (v2.15) |
| 상품 등록(쿠팡·알리·토스) | × | × | – | ○ | ○ |
| 상세페이지 이미지 가져오기 | × | × | – | ○ | × |

### 2-2. 글 생성

| 기능 | 기획 | 포스팅 | 댓글 | 쇼핑제휴 | 운영 |
|---|---|---|---|---|---|
| 본문 AI 공급사 | ○ 3사 | △ OpenAI 1사 | ○ 3사(답글) | ○ 3사 | ○ 3사 |
| 페르소나·말투 | ○ | × | △ 답글 말투 프리셋 | ○ 페르소나 선택 | ○ 운영 프로필 |
| 훅(첫 문장) 변형 | ○ 5종 | × | – | × | ○ |
| 다시 쓰기 | ○ 7종 | × | – | △ 인기글 다시 쓰기 | ○ |
| 첫 댓글 참여 질문 | ○ | × | – | × | ○ |
| 500자 제한 안내·검사 | 미확인 | ○ | – | ○ | ○ |
| 쇼핑 공시 문구 | × | × | – | ○ | ○ |
| 당해 연도 주입(핵심 원칙 8) | ○ | × | – | × | ○ `yearRule.ts` |
| 생성 결과 서버 저장 | △ 수동 저장 + 브라우저 사본 | ○ | ○ | ○ | ○ |

### 2-3. 이미지

| 기능 | 기획 | 포스팅 | 댓글 | 쇼핑제휴 | 운영 |
|---|---|---|---|---|---|
| AI 이미지 생성(Gemini 나노바나나) | △ 배포판만(운영 숨김, v1.49) | ○ | – | ○ | ○ |
| GPT Image·Replicate | △ GPT Image(배포판) | × | – | ○ 둘 다 | △ Replicate 키 등록 |
| 무료 사진(회원 Pixabay·Pexels 키) | × | ○ (v1.29) | – | × | ○ (v2.17) |
| 사진 키워드 사전(한→영) | × | ○ 기준 | – | × | ○ 사본 |
| 여러 장(캐러셀) 게시 | × | ○ | – | ○ | ○ |
| 영상 첨부 게시 | × | 미확인 | – | 미확인 | ○ |
| 이미지 30일 정리 | ○ 보관함 열 때 | ○ 안 쓰는 파일만(v1.30·v1.31) | – | ○ | ○ |

### 2-4. 게시·예약

| 기능 | 기획 | 포스팅 | 댓글 | 쇼핑제휴 | 운영 |
|---|---|---|---|---|---|
| Threads 공식 API 게시 | × | ○ | ○ 답글 | ○ | ○ |
| 보관만(초안 저장, 게시는 회원) | △ 복사만 | ○ draft | ○ 승인 대기 | ○ | ○ |
| 즉시 게시 | × | ○ | ○ 승인 후 | ○ | ○ |
| 예약 게시 | × | ○ | – | ○ | ○ 매분 |
| 예약 실행 방식 선택(Vercel / 회원 cron-job.org) | × | ○ | ○ 자동 수집용 | ○ | ○ 기준 |
| 중복 게시 방지(`publishing` 선점) | – | ○ | 미확인 | ○ | ○ 끊김 30분 정리 |
| 게시 결과(permalink·시각) 기록 | – | ○ | ○ 답글 ID·시각(`posted_reply_id`·`replied_at`) | ○ | ○ |
| 여러 Threads 계정 | × | × | × | × | ○ |
| 회원 본인 Meta 앱(공용 앱 금지) | – | ○ | ○ 기준 | ○ | ○ |
| Meta 삭제·해제 콜백 | – | × | × | ○ (쓰레드 대표) | × |

### 2-5. 댓글 응대

| 기능 | 기획 | 포스팅 | 댓글 | 쇼핑제휴 | 운영 |
|---|---|---|---|---|---|
| 댓글 수집 | × | × | ○ | × | △ 데스크톱 앱(세부 미확인) |
| AI 답글 초안 | × | × | ○ | × | △ 데스크톱 앱(세부 미확인) |
| 승인 대기열(`pending_review`) | × | × | ○ | × | × |
| 텔레그램 승인 버튼 | × | × | ○ | × | × |
| 자동 게시(위험 동의 후 선택) | × | × | ○ 기본 꺼짐 | × | × |
| 자동 수집 회원 선택·주기 | × | × | ○ (v1.26) | × | × |
| 주간 답글 그래프 | × | × | ○ | ○ 주간 게시 그래프 | × |

### 2-6. 보관·공통·보안

| 기능 | 기획 | 포스팅 | 댓글 | 쇼핑제휴 | 운영 |
|---|---|---|---|---|---|
| 회원 서버 저장(RLS) | △ 브라우저 사본 병행 | ○ | ○ | ○ | ○ |
| 글감·초안 30일 정리 | ○ | △ 이미지만(게시 기록 유지), 후보 정리 미확인 | × 못 찾음 | ○ 미디어 | ○ 글감·초안 |
| 정리 회원별 기록(`cleanup-usage-log`) | × | ○ | × | ○ | ○ |
| 생성 캐시 회원별 격리 | – | – | – | × 검색·트렌드 캐시 공유 | – |
| 외부 비밀번호 저장 | – | × NewsBlur 평문 | – | – | – (NewsBlur 안 씀) |
| 이용 안내(`/guide`) | ○ | ○ | ○ | ○ | ○ 화면 안 안내 |
| 설치 키트(독립 모드 스위치) | ○ `KIT/` | × | × | △ 스위치만 | ○ `KIT/` |
| 데스크톱 앱·크롬 확장 | × | × | × | × | ○ `desktop/` |
| 개인 토큰(데스크톱 연결용) | × | × | × | × | ○ |

## 3. 고유 기능 (한 곳에만 있는 것) — 가져올 때 출처

| 프로그램 | 그곳에만 있는 기능 | 상태 |
|---|---|---|
| 기획 | 훅 5종 바꿔 끼우기·다시 쓰기 7종의 원본, 설치 키트 배포판(ALLA AI) | 운영에 이식됨(v2.15 이전부터 `lib/attention.ts`·`lib/personas.ts`) |
| 포스팅 | NewsBlur 피드, 글감 카테고리, 사진 키워드 사전 기준 | NewsBlur는 비밀번호 저장 문제로 운영에 옮기지 않음 |
| 댓글 | 승인 대기열, 텔레그램 승인, 자동 게시 선택, 자동 수집 회원 선택 | 독립 |
| 쇼핑제휴 | 네이버 데이터랩·검색, Threads 인기글 탐지, 상세페이지 이미지, 상품 이미지 분석, Meta 삭제·해제 콜백 | 독립(콜백 주소 이동 금지) |
| 운영 | 여러 계정, 유튜브 쇼츠 글감, 중복 게시 방지 기준, 데스크톱 앱·개인 토큰 | 기준이라 그대로 |

## 4. 기능별 기준 코드 위치 (새로 만들기 전에 읽을 곳)

| 기능 | 기준 파일 | 비고 |
|---|---|---|
| 예약 게시·중복 방지·끊김 정리 | `threads-content-ops/lib/scheduledDispatch.ts` | [예약 지침](SCHEDULER_POLICY.md) 기준 구현 |
| 예약 실행 방식(Vercel / cron-job.org) | `threads-content-ops/lib/memberScheduler.ts`·`lib/schedulerConfig.ts`·`lib/cronJobOrg.ts` | 공용 `member-scheduler` 사본 — 사본 직접 수정 금지 |
| Threads 게시(단일·캐러셀) | `threads-content-ops/lib/threadsPublish.ts` | 포스팅·쇼핑제휴는 `src/lib/posts/publish-core.ts` |
| 여러 계정 연결 | `threads-content-ops/lib/threadsSharedAccounts.ts` | 공용 `member_platform_accounts` + `tco_threads_accounts` |
| 회원 본인 Meta 앱 OAuth | `threads-comment-reply/app/api/threads/callback/route.ts`·`lib/oauthState.ts` | 공용 앱 금지(핵심 원칙 4), 프로그램 비교표 §2 기준 |
| 페르소나·훅·다시 쓰기 | `threads-content-ops/lib/personas.ts`·`lib/attention.ts` | 원본 `threads-easy-planner/src/lib/ai/generator.ts` |
| 사진·영상 분석 글쓰기 | `threads-content-ops/lib/mediaProcessor.ts` | 원본 `threads-easy-planner/src/lib/mediaProcessor.ts` |
| 시간대 추천 주제 | `threads-content-ops/lib/topicSuggestions.ts` | |
| 당해 연도 지시 | `threads-content-ops/lib/yearRule.ts` | 포스팅·쇼핑제휴에 없음 |
| 글감 수집(웹·Perplexity) | `threads-content-ops/lib/collector.ts` | 포스팅 `threads/src/lib/ai/collector.ts`(NewsBlur 포함) |
| 유튜브 쇼츠 글감 | `threads-content-ops/lib/youtubeShorts.ts`·`lib/shortsAnalysis.ts` | |
| 무료 사진 | `threads-content-ops/lib/photoSearch.ts`·`threads/src/lib/photoSearch.ts` | 공용 `free-photo-search` 사본 |
| 사진 키워드 사전 | `threads/src/lib/photoKeywords.ts` | 공용 `photo-keywords` 기준(사본 운영·INSTA) |
| 상품 제휴 연동(쿠팡·알리·토스) | `threads-affiliate-poster/src/lib/affiliate-clients/*` | 공용 `affiliate-clients` 기준(사본 `threads-content-ops/lib/affiliate-clients/`), 커밋 `f35d3f91f` |
| 네이버 데이터랩·검색 | `threads-affiliate-poster/src/lib/naver/trend.ts`·`search.ts` | 캐시(`searchCache.ts`·`trendCache.ts`)는 회원 공유 문제 — 그대로 복사하지 말 것 |
| 상품 이미지 분석·상세페이지 | `threads-affiliate-poster/src/lib/ai/productAnalyzer.ts`·`lib/detailPages.ts`·`lib/shopDetailImport.ts` | |
| Meta 서명 요청(삭제·해제) | `threads-affiliate-poster/src/lib/threads/signedRequest.ts` + `app/api/threads/delete`·`uninstall` | |
| 댓글 수집·답글 게시 | `threads-comment-reply/lib/comments/sync.ts`·`lib/comments/post.ts` | |
| AI 답글 지시문 | `threads-comment-reply/lib/ai/reply.ts` | v1.26 Threads용으로 수정 |
| 텔레그램 승인 | `threads-comment-reply/lib/telegram/client.ts`·`app/api/telegram/webhook/[userId]/route.ts` | 공용 `telegram-bot-client` |
| 글감·초안 30일 정리 | `threads-content-ops/lib/contentCleanup.ts`·`lib/mediaCleanup.ts` | 예약 대기·게시 기록은 남김 |
| 정리 회원별 기록 | `threads/src/lib/cleanupUsageLog.ts` 등 | 공용 `cleanup-usage-log` 사본 |

## 5. 병합·독립 방향 (결정된 것)

| 묶음 | 내용 | 상태 |
|---|---|---|
| A 기획 → 운영 | 기획 앱 장점(사진·영상 분석 글쓰기, 시간대 추천 주제)을 운영에 더하고 **기획 앱은 독립 유지**(주인님 10-23: 「기획만 하는 자동화 프로그램은 그냥 유지」) | ✅ 운영 v2.15 `47b447340` — 기획 앱 코드·카탈로그·권한 변경 없음 |
| 공용 코드 | 상품 제휴 연동을 공용 기준 코드 `affiliate-clients`로(기준 쇼핑제휴) | ✅ 쇼핑제휴 v1.83·운영 v2.16 `f35d3f91f` |
| 독립 | 포스팅(입문·FREE), 쇼핑제휴(고유 입력·콜백 담당), 댓글(동작 방식 다름), 운영(기준) | – |

원칙: 「병합」은 좋은 기능만 기준 프로그램에 더하는 것이다(주인님 정의). 쓰레드 5개는 모두 남는다.

## 6. 확장 후보·로드맵 (추천 — 구현 전)

| 단계 | 기능 | 넣을 곳 | 출처·근거 | 비용 | 상태 |
|---|---|---|---|---|---|
| 1차 | 네이버 검색·트렌드 캐시 회원별 격리 + 30일 정리 | 쇼핑제휴 | 통합 분석 §6-2, 최상위 규칙 | DB 칸 추가(승인) | 대기 |
| 1차 | NewsBlur 비밀번호 암호화 저장 | 포스팅 | 통합 분석 §6-4 | 없음 | 대기 |
| 1차 | 당해 연도 지시 주입 | 포스팅·쇼핑제휴 | 운영 `yearRule.ts`, 핵심 원칙 8 | 없음 | 후보(이번 초안에서 발견) |
| 2차 | 댓글·답글 30일 정리 | 댓글 | 통합 분석 §6 「그 밖에」 | 없음 | 후보 |
| 2차 | 포스팅 글감 후보 30일 정리 확인 | 포스팅 | 통합 분석 §6 「그 밖에」 | 없음 | 확인 필요 |
| 2차 | 기획 앱 구형 모델 목록 정리 | 기획 | 통합 분석 §6 「그 밖에」 | 없음 | 후보 |
| 2차 | 기획 앱 브라우저 사본 회원 구분(또는 제거) | 기획 | 통합 분석은 「병합 A로 해소」로 봤으나 기획 앱이 독립 유지돼 남음 | 없음 | 후보 |
| 2차 | 운영 입문 안내(기능별 필수/선택 표시) | 운영 | 이전 제안 D-17-02 | 없음 | 후보 |
| 3차 | 포스팅에 글 생성 AI 3사 | 포스팅 | 운영·쇼핑제휴 방식 | 없음 | 후보 |
| 3차 | 운영 웹에 댓글 답글(댓글자동화 연결) | 운영 | 데스크톱 앱에만 있음 | 없음 | 후보 — 댓글자동화와 겹침 판단 필요 |

### 미배포 대기 (쓰레드)

2026-10-24 확인 기준 없음(운영 v2.20·댓글 v1.28에 대기분이 함께 나감 — `docs/PENDING_DEPLOYS.md`).

## 7. 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 5개 프로그램 정의·기능 6개 영역 표·고유 기능·기준 코드 위치·결정·로드맵 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
