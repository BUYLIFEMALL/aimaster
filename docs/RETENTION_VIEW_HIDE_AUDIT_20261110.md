# 30일 「화면 숨김」 조사 — 블로그 밖 프로그램 (2026-11-10)

- 작성: [역할: mac-mini] Claude Code(맥미니) `claude-mac-20261110-test` · 읽기 전용 조사(코드·DB 변경 없음)
- 배경: 관리자·시험 계정(`profiles.retention_exempt = true`)은 모든 프로그램에서 30일 **삭제와 화면 숨김** 둘 다 빠져야 한다(루트 `CLAUDE.md` 최상위 규칙, [`PLAN_20261031_RETENTION_EXEMPT_ACCOUNTS.md`](PLAN_20261031_RETENTION_EXEMPT_ACCOUNTS.md) §2). 블로그 프로그램은 2026-11-03 숨김을 풀었고(참고 구현: `tistory-auto-blog/utils/retentionExempt.ts`, `naver-blog-seo-studio/lib/retentionExempt.ts`, `blog-content-maker`의 `expiryCutoff`), 블로그 밖은 이번이 첫 조사다.
- 방법: `git grep`으로 30일 조건(`.gt/.gte("created_at"|"expires_at")`, `30 * 24 * 60 * 60`, `RETENTION_DAYS` 등) 후보 43개 폴더를 찾아 숨김/삭제/기타로 분류. 핵심 3곳은 직접 코드 대조(아래 ✔). SQL은 각 폴더 `supabase/migrations`의 RLS·pg_cron만 봄.

## 1. 숨김이 있는데 예외 처리가 없는 프로그램 (9개)

| 프로그램 | 위치 | 숨기는 것 | 예외 코드 | SQL도 고쳐야 |
|---|---|---|---|---|
| `competitor-analysis` | `app/(dashboard)/` 분석·경쟁사·키워드·확장 목록/상세 전부(`.gt("created_at", retentionCutoff())`), `app/api/work-inbox/route.ts`, `lib/actions/analysis.ts`, `lib/actions/expandSeeds.ts` · RLS `20261016115339_member_owned_generated_data_retention.sql` | SERP 작업·분석·회사 프로필·롱테일 확장·작업 받은편지함 | SQL 함수 `competitor_retention_exempt()`가 있으나 `partner_channels`에만 씀 | 예(RLS + pg_cron) |
| `ai-doc-chatbot` ✔ | `src/app/api/documents/route.ts:22,25`, `src/lib/chat/documents.ts`, `documentSearch.ts`, `ingest.ts`, `uploadChecks.ts` (기준 `documentRules.ts` `documentCutoff`) · RLS `20261024181527_g4_document_evidence.sql` | 문서 목록·단건, 답변 근거, 검색 대상(용량 계산에서도 빠짐) | 없음 | 예(RLS + `0001_dcb_init.sql` pg_cron) |
| `youtube-viral-studio` | `src/app/api/favorites/route.ts:14`, `lib/favorites.ts:12` · RLS `20261017025253_yvs_member_favorites.sql:18` | 즐겨찾기 영상·채널 | 없음 | 예(RLS + 1분마다 pg_cron) |
| `music` | RLS `0013_studio_tables_storage_listing.sql:45`(`updated_at` 30일) — `app/api/studio/library/route.ts`가 회원 세션으로 읽어 걸림 | 정밀 기획 보관함 | 정리 라우트 `cron/cleanup`만 예외 있음 | 예(RLS + pg_cron 52·58행) |
| `trending-product-finder` | `app/(dashboard)/reports/page.tsx:51-57`, `dashboard/page.tsx:37` | 추천 리포트 | cron 정리만 `retentionExemptFilter` 사용 | 아니오 |
| `ai-image-studio` | `app/(dashboard)/gallery/page.tsx:24`, `lib/prompts/customPromptHandlers.ts` · RLS `20261020004317_image_studio_custom_style_prompts.sql` | 갤러리, 내 스타일 프롬프트 | cron만 예외 | 예(프롬프트 RLS·트리거) |
| `document-translator` | `src/app/api/projects/route.ts:28`(`expires_at`) | 번역 프로젝트 목록·단건 | 없음 | 확인 필요 |
| `threads-easy-planner` ✔ | `src/lib/actions/savedPlans.ts:132` | 저장한 기획 목록 | 없음 | 아니오 |
| `ai-influencer-studio` ✔ | `src/app/api/history/route.ts:36-38` | 작업 히스토리(조회 때 숨기고 **지움**) | 없음 | 아니오 |

## 2. 예외 없이 **지우는** 곳 (자료가 실제로 사라짐 — 우선순위 높음)

- ⚠ **`threads-easy-planner` `savedPlans.ts:117-122` ✔**: 기획 목록을 열 때마다 `user_id` 조건 없이 **모든 회원**의 30일 지난 기획을 `delete`. 예외 회원 자료도 지워진다(누가 목록을 열든).
- `ai-influencer-studio` history 조회 때 삭제(`removeRows`), `src/lib/instagram/posting.ts:153`
- `four-cut-comics` `src/lib/instagram/posting.ts:153`
- `shorts-viral-studio` `src/lib/actions/projects.ts:63-64`(목록 열 때 삭제)
- `web-crawler` `webapp/src/app/api/cron/purge-expired/route.ts:27-32`, 결과 내려받기 `jobs/[id]/download/route.ts:31`은 30일 뒤 410
- `insta_auto_poster` `src/lib/cardnews/instagram/posts.ts:166`, `ai-webtoon-studio` `src/lib/instagram/posting.ts:153` (`cleanupOldPosts`)
- SQL pg_cron(예외 없음): `competitor-analysis` `cleanup_competitor_generated_data`·롱테일, `ai-doc-chatbot` `0001_dcb_init.sql:80-84`, `youtube-viral-studio`, `music` `0013`

## 3. 이미 예외 처리된 곳

- 숨김까지 처리: `ai-video-studio`(`isRetentionExempt`), `free-music-studio`(화면에 예외 표시, 서버 30일 거름 없음), `four-cut-comics` 서버 저장분(`saved.ts:46`), `portrait-photo`(`saved.ts:51`)
- 삭제만 있고 예외 처리됨: `ai-work-workspace`, `threads-content-ops`, `music-video-studio`, `threads-affiliate-poster`, `shop-detail-page`, `real_estate_sales`(365일), `youtube-auto-reply`, `smartstore-register`, `coupang-ops`, `ai-music-studio`, `thumbnail-master`, `style-dna-analyzer`, `reverse-prompt`, `cinematic-storyboard-studio`, `banana-canvas`, `shots`, `shorts-onestop-studio`, `threads`

## 4. 애매한 곳

- 브라우저 저장소(IndexedDB)만 쓰는 `four-cut-comics` 작품 목록(`comic/gallery.ts:45`)·`fashion-style`(`look/storage.ts`): 서버가 회원 예외 여부를 넘겨주지 않으면 걸 수 없음.
- `music-video-studio` `src/lib/music/aisImages.ts:17-22`: 다른 프로그램 이미지의 「최근 30일」 고르기 화면 — 숨김으로 볼 여지.

## 5. 제안 (각 담당 세션 몫, 주인님 결정 필요)

1. **먼저** `threads-easy-planner` 전체 회원 삭제 줄에 `user_id` 조건 + 예외 회원 제외(작은 수정, 다음 배포 때). 2번 목록의 「지우는 곳」을 그다음 차례로.
2. 숨김 9개는 블로그와 같은 방식(공용 예외 판별 → 예외 회원이면 30일 조건 생략)으로 각 프로그램 다음 배포 때 함께. RLS 숨김 4개(`competitor-analysis`·`ai-doc-chatbot`·`youtube-viral-studio`·`music`)는 SQL 변경이라 주인님 승인 뒤.
3. 담당: `threads-easy-planner`·`ai-influencer-studio`·`insta_auto_poster`·`ai-webtoon-studio`·`four-cut-comics`(SNS 계열, 역할 미지정), `competitor-analysis`·`web-crawler`(분석), `ai-doc-chatbot`(docbot-prompt), `youtube-viral-studio`·`shorts-viral-studio`(video), `music`·`ai-image-studio`(music 쪽 이미지 연동), `trending-product-finder`(ecommerce-image), `document-translator`(미지정).
