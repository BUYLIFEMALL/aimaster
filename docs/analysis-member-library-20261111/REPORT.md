# 「내 자료함」(같은 계정 안 프로그램 간 자료 재사용) 설계용 — 생성물 저장 구조 분석

> 2026-11-11 주인님 요청: 「같은 계정이라면 다른 프로그램에서 만든 데이터, 콘텐츠, 이미지, 음악, 영상, 파일 등을 조회하거나 가져와서 재사용할 수 있게 할 수 있나?」「프로그램과 db가 어떤식으로 만들어져있는지 자세하고 면밀히 분석해봐」
> 방법: 읽기 전용 분석(Claude Code 윈도우 · 세션 `claude-win-rea`, 분석 에이전트). 근거는 **저장소 코드·마이그레이션 파일**이며, 운영 DB의 실제 버킷 공개 여부·정책·`cron.job` 등록은 직접 조회하지 않아 **미확인**. `labs/`·`.vercel/compat-deploy/`·`scratch/`·`_backup*` 제외.
> 상태: **분석만 완료 — 설계·구현은 주인님 결정 뒤.**

## 1. 한눈에 보기
- 앱 폴더(`package.json`) 99개, 생성물을 DB 표에 저장하는 프로그램 약 70개, Supabase Storage 버킷 약 40개.
- **좋은 점**: 생성물 표는 거의 모두 `user_id`가 있다(회원 칸 없는 표는 공용 시세·캐시뿐: `commercial_land_trades`, `naver_trend_cache`, `customs_fx_rates`). 파일 경로도 사실상 `{user_id}/...`로 통일(35개 프로그램 코드 확인).
- **어려운 점**: 생성물 기록 방식이 제각각(공개 주소 `image_url` / 버킷 경로 `storage_path`·`output_path` / JSON 묶음 `outputs`·`data`·`images` / 쉼표로 이은 주소 문자열 `posts.image_url`). 공개 버킷(약 17)과 비공개 버킷(약 23)이 섞였고, 비공개 다수는 Storage 정책 없이 서버 키 전용.
- **선례 30곳+**: 음악 3종(`ams_generations`·`free_music_tracks`·`music_tracks`)을 영상 4개가 읽고, 글 전용 공용 받은편지함 `work_inbox` 운영 중 → 이 둘을 일반화하는 방향이 자연스럽다.

## 2. 자료 종류별 저장 현황 (핵심)
약어: 본인폴더 = Storage 정책이 경로 첫 폴더 = 로그인 회원 id 검사 · 서버전용 = 비공개 버킷인데 정책 없음 · 정리 = 30일 정리 코드 있음.

### 2-1. 글·텍스트
| 프로그램 | 표 | 내용 칸 | 30일 정리 |
|---|---|---|---|
| `ai-auto-blog` | `blog_posts` 외 | 본문(“소유자 불명 7행” 주석) | 있음 `app/api/cron/cleanup-images` |
| `tistory-auto-blog` | `tistory_posts` | `content` | 있음 |
| `naver-blog-agent` | `nba_posts` | `content`, `images` jsonb, `post_url` | 있음 |
| `naver-blog-seo-studio` | `naver_blog_seo_drafts` | `body`, `image_path` | 있음 `cron/draft-retention` |
| `naver-blog-allinone` | `aio_posts` | `images` jsonb | 있음 |
| `blog-workroom` | `blog_workroom_items` | `data` jsonb | 있음 |
| `blog-content-maker` | `blog_content_maker_projects`·`_assets` | `path`, `expires_at` | 화면 진입 때 정리 |
| `wp-blogger-auto` | `wba_posts` | `html`, `images` jsonb, `expires_at` | 있음(발행 이미지 보관 연장) |
| `threads` | `posts` | `content`, `image_url`(쉼표 문자열) | 있음 `api/cleanup-images` |
| `threads-content-ops` · `threads-affiliate-poster` | `tco_posts` · `tap_posts` | `body` · `content`,`image_url` | 있음 |
| `kakao_auto_poster` · `ai-writing-editor` | `kakao_reports` · `ai_writing_editor_documents` | `content` | 미확인 |
| `document-translator` | `dt_projects` | `expires_at` | pg_cron |
| `auto-detail-page` · `landing-architect` | `detail_pages` · `landing_architect_projects` | `html` | 미확인 |
| `ai-work-workspace` | `work_inbox`(공용 받은편지함) | `body_md`, `data` | 1년 보관 지정(2026-11-11) |

### 2-2. 이미지
| 프로그램 | 표 / 버킷 | 경로 | 공개 | 정리 |
|---|---|---|---|---|
| `ai-image-studio` | `user_image_generations` / `ai-image-generations` | `{user.id}/…` | v1.23 비공개 전환(남은 공개 정책 미확인) | 있음 |
| `banana-canvas` | `banana_canvas_results`(`outputs`) / `banana-canvas-files` | `{userId}/in/…` | 비공개·서버전용 | 있음 |
| `portrait-photo` | `portrait_photo_saved` / `portrait-photo-files` | `{userId}/…` | 비공개 | 있음 |
| `four-cut-comics` | `fcc_insta_posts` / `four-cut-comics-files` + `insta-post-images` | `{userId}/…` | 비공개+공개 | 있음 |
| `ai-influencer-studio` | `aif_history` / `aif-history` + `insta-post-images` | `{userId}/history/…` | 비공개+공개 | 있음 |
| `ai-webtoon-studio` | `wts_insta_posts` / `insta-post-images` | `{userId}/…` | 공개 | 있음 |
| `insta_auto_poster` | `insta_posts`, `cns_projects` / `insta-post-images`, `cardnews-images` | 본인폴더 | **공개** | 미확인 |
| `thumbnail-master` | `thumbnail_master_projects`(`images_a/b`) / `thumbnail-master-images` | `{userId}/{projectId}/…` | 비공개 | 있음 |
| `shop-detail-page` | `shop_product_images` / `shop-detail-images` | `{user.id}/products/…` | v1.15 비공개 | 있음 |
| `cinematic-storyboard-studio` · `style-dna-analyzer` · `reverse-prompt` | 각 표 / `storyboard-ai` · `style-dna-images` · `reverse-prompt-tmp` | `{userId}/…` | 비공개 | 있음 |
| `ai-writing-editor` · `naver-blog-agent` · `threads-easy-planner` | / `ai-writing-editor-images` · `naver-blog-agent-media`(+`nba-private-photos`) · `tep-images` | `{userId}/…` | 공개(일부 비공개) | 미확인 / 있음 / **모든 회원 행 삭제 위험 기록** |
| 공유 `post-images` | `threads`·`threads-affiliate-poster`·`naver-cafe-poster`·`ai-auto-blog`·`tistory-auto-blog` 공용 | `{userId}/uuid` | **공개** | 프로그램마다 |
| 그 밖 공개 버킷 | `kakao-report-images`, `stepmail-images`, `ig-media-thumbnails`, `allinone-images`, `blog-workroom`, `wba-images`, `tarot-card-images`, `mbti-character-images`, `threads-content-ops-media`, `shots-videos` | 본인폴더 | 공개 | 프로그램별 |

### 2-3. 음악·음성
| 프로그램 | 표 / 버킷 | 비고 | 공개 | 정리 |
|---|---|---|---|---|
| `music`(Suno) | `music_tracks`, `music_track_variants` / `music-audio` | 복사 실패 시 **Suno 임시 주소(약 14일 만료)** 저장(`music/lib/actions/storageRestore.ts`) | 0014 비공개 | 있음 |
| `ai-music-studio` | `ams_generations`(`outputs` `{path,title,durationS,bytes}`) / `ai-music-studio` | `{user_id}/{generation_id}/{n}.mp3` | 비공개·서버전용 | 있음 |
| `free-music-studio` | `free_music_tracks`, `free_music_songs` | 버킷 사용 미확인 | — | 있음 |
| `shots` | / `shots-bgm` | `{userId}/{videoId}-….mp3` | 미확인 | 있음 |
| `ai-mastering-studio` · `ai-audio-analyzer` | 생성물 표 없음 | 회원 PC 처리·내려받기 | — | — |

### 2-4. 영상
| 프로그램 | 표 / 버킷 | 공개 | 정리 |
|---|---|---|---|
| `ai-video-studio` | `avs_generations`, `avs_edits` / `ai-video-studio`(50MB) | 비공개 | 있음 |
| `music-video-studio` | `mvs_renders` / `music-video-studio` | 비공개 | 있음 |
| `shorts-onestop-studio` | `shorts_onestop_items` / `shorts-onestop-studio` | 비공개 | 있음 |
| `shots` | / `shots-videos`, `shorts-images` | `shots-videos` **공개** | 있음 |
| `video-to-gif` · `playlist-channel-studio` | `videotogif_conversions` · `playlist_projects` / 각 버킷 | 비공개 | 미확인 |
| `lyric-video-studio` | `lyric_video_items` | 렌더는 회원 PC | pg_cron |

### 2-5. 파일·기타
`ai-doc-chatbot`(`dcb_documents`·`dcb_chunks` / `dcb-uploads`), `real_estate_sales`(`real_estate_onsite_photos`, 1년 보관), 분석·수집 계열(`competitor_*`, `longtail_*`, `blog_keyword_reports`, `web_crawler_jobs` 등 텍스트·JSON).

## 3. 저장 위치 유형
1. **DB 표만**: 원고·리포트·키워드·번역 — 모두 `user_id`, 대부분 소유자 RLS. `bnc_*`, `ncr_*`, `dt_operations`, `smartstore_register_ext_tokens` 등은 소유자 정책 없이 서버 키 전용(서버 코드의 `user_id` 필터 전수 확인은 미확인).
2. **Supabase Storage**: 공개 약 17개(인스타·쓰레드 게시가 공개 주소만 받기 때문 — `insta_auto_poster/src/lib/shopDetailImport.ts` 주석), 비공개 약 23개(서명 주소 1시간).
3. **외부**: Suno 임시 주소. Cloudinary·Vercel Blob 실사용 없음.
4. **회원 PC·브라우저만**: IndexedDB(`banana-canvas`, `four-cut-comics`, `portrait-photo`, `music-video-studio`, `web-crawler`, `markdown-studio`, `music-player`, `photo-remake-studio`, `fashion-style`, `shop-order-report`, `ai-work-workspace`), 확장 `chrome.storage.local`(`realty-listing-alert`, `trending-product-finder`, 블로그 확장 6종, `smartstore-register`, `commercial-land-trade-alert`). 생성물 표 없음(`usage_logs`만): `markdown-studio`, `music-player`, `file-merge`, `image-convert-studio`, `photo-remake-studio`, `fashion-style`, `shop-order-report`, `infinite-loop-video`, `ai-mastering-studio`, `emotion-writer`, `persona-style-studio`. DB 미사용: `allinone-graphic`, `vinyl-lp-studio`, `seo-thumbnail-pro`, `yt-playlist-studio`, `prompt-template-studio`, `ebook-studio`, `suno-music-studio`(미확인).

## 4. 이미 있는 공용·연계 선례
- **한 번 등록 → 모든 프로그램 재사용**: `user_api_keys`, `member_platform_accounts`·`integration_catalog`(`supabase/migrations/0039_member_integrations.sql`, [`MEMBER_INTEGRATIONS.md`](../MEMBER_INTEGRATIONS.md)), 사실상 공용 `user_telegram_links`(10개)·`user_solapi_accounts`(8개).
- **공용 받은편지함 `work_inbox`** — 글 전용 자료함의 원형([`WORK_INBOX.md`](../WORK_INBOX.md)): `user_id`, `source_slug`, `target_slug`, `kind`, `title`, `body_md`, `data`, `source_url`, `imported_at`. 서버 키로만 넣고 읽기는 본인 + 자기 `target_slug`. `work-inbox-client` 사본 13개. **파일·이미지 칸 없음.**
- **다른 프로그램 표를 서버에서 직접 읽기**(자료함 「가져오기」의 사실상 표준): 음악 → 영상(`ai-video-studio/lib/edit/amsSongs.ts`, `shorts-onestop-studio/src/lib/amsSongs.ts`, `music-video-studio/src/lib/music/amsSongs.ts`·`fmsSong.ts`, `playlist-channel-studio/src/lib/amsTracks.ts`·`sunoTracks.ts`·`fmsTracks.ts`, `lyric-video-studio/src/lib/ams.ts`·`suno.ts`·`fms.ts`) — `user_id` 필터 → 경로 `{userId}/` 재확인 → 1시간 서명 주소 → 복사 안 함. 썸네일 → 영상(`thumbnailPicks.ts`), 상세페이지 → 판매 등록(`smartstore-register`, `coupang-ops`), 상세페이지 → 인스타(비공개 → 공개 버킷 복사), 글 연계(`naver-blog-agent` ← `naver_blog_seo_drafts` 등).
- **여러 프로그램 생성물을 한 화면에**: `insta_auto_poster/src/lib/instaWeek.ts`(5개 게시 표를 「표·칸·버킷」 목록으로 정의), `comment-inbox`.
- **브라우저 안 넘기기**: `nukki-handoff`·`gif-handoff`(`postMessage`), `resave-receiver`, `link-mark`, `?from=`·`?flow=`·`#import=` — [`SHARED_MODULES.md`](../SHARED_MODULES.md) 40~87행.

## 5. 걸림돌·위험
1. 기록 방식 제각각, 제목 칸 없는 표(`posts`, `tco_posts`) → 프로그램마다 「표 → 공통 항목」 변환기 필요.
2. 공유 버킷 `post-images`는 경로로 프로그램을 구분 못 함. `threads/src/lib/postImageCleanup.ts` 50~95행은 `posts`만 보고 30일 지난 미사용 파일을 지워 다른 두 프로그램 파일도 지울 수 있는 구조.
3. 공개 버킷 약 17개 — 「회원 본인만」 원칙과 충돌, 게시 때문에 일괄 비공개 전환은 어려움.
4. 비공개 버킷 다수 Storage 정책 없음 → 자료함 서버는 「`user_id` 필터 + 경로 첫 폴더 재확인」 필수.
5. 보관 기간 혼재(30일 / 1년 / 무기한 / 계정 열외 `retention_exempt`), 정리 코드 43개 각자 → 가져간 순간 원본이 지워질 수 있음: 참조·복사·남은 기간 표시 결정 필요.
6. Suno 임시 주소(약 14일 만료).
7. Supabase 업로드 한도 50MB → 영상 복사형 불리.
8. 회원 PC·브라우저 자료는 서버가 못 봄(「올리기」 필요).
9. `ai-work-workspace` U13 「초대 회원끼리 공유」 예외(TOP_RULE §8, 2026-11-11)와 범위 구분 필요 — 자료함은 「같은 회원 안」만.
10. `blog_posts` 소유자 불명 7행(`ai-auto-blog/supabase/migrations/20261009164750_blog_personal_access_hardening.sql` 2행).

## 6. 설계 방향 후보
- **A안 — 색인 표 + 원본 유지(추천)**: 공용 `member_assets`(`user_id`, `source_slug`, `kind`, `title`, `bucket`, `path`/`url`, `source_table`, `source_id`, `mime`, `bytes`, `expires_at`, `created_at`). 각 프로그램이 생성 직후 서버에서 한 줄 등록(`work-inbox-client`처럼 공용 기준 코드 사본). 열 때 서버가 소유·경로 확인 후 서명 주소. 장점: 복사 없음·검증된 방식·하나씩 붙임. 단점: 원본 정리 때 색인도 지워야 함, 프로그램마다 등록 코드.
- **B안 — 읽기 전용 어댑터**: `instaWeek.ts`처럼 「프로그램 → 표·칸·버킷」 설정으로 각 표를 직접 읽어 합침. 장점: 기존 프로그램 수정·배포 없음, 기존 자료 바로 보임. 단점: 표 구조 변경에 약함, 해석 코드 증가, 느릴 수 있음.
- **C안 — 공용 비공개 버킷으로 복사**: 「자료함에 담기」 시 `member-library/{user_id}/…`로 복사. 장점: 원본 정리와 무관. 단점: 용량·50MB 한도·중복·보관 규칙 신설.
- **조합 권장**: B로 기존 자료 먼저 보여 주기 → 새 생성물부터 A 색인 → 영구 보관이 필요한 것만 C. 글은 `work_inbox`를 넓히거나 A에 「글」 종류로 합칠지 검토.
- **붙이는 순서 추천**: 1) 음악 3종 → 2) 이미지 스튜디오(`ai-image-studio`, `banana-canvas`, `portrait-photo`, `thumbnail-master`) → 3) 영상(참조만) → 4) 블로그 원고(`work_inbox` 정리 후) → 5) 공개 공유 버킷(파일 주인 구분 규칙 먼저).

## 7. 주인님 결정이 필요한 것
1. 자료함 항목 보관 기간: 원본을 따를지, 따로 정할지.
2. 공개 버킷 자료를 자료함에 보일 때 공개 주소를 그대로 쓸지.
3. 회원 PC 자료도 「올리기」로 받을지.
4. A/B/C 중 방향과 첫 대상 프로그램.
