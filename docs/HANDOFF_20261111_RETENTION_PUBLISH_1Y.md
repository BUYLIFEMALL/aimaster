# 인수인계 — 보관 기본 규칙 「발행 1년 · 생성만 30일」 프로그램별 적용 요청 (2026-11-11)

> 작성: Claude Code(윈도우) · 세션 `claude-win-rea` · [역할: 미지정] · 주인님 지시 「너가 할수 있는건 너가하고 담당이 해야 할것만 전달할 내용 정리해서 남겨줘 관련 인수인계 문서도 같이 만들고」
> 근거 규칙: [`TOP_RULE_PERSONAL_ACCOUNT_API.md`](TOP_RULE_PERSONAL_ACCOUNT_API.md) §0 맨 위 「보관 기간 기본 규칙」·§8 2026-11-11 줄. 결정: 각 프로그램 정리 코드는 **담당이 그 프로그램을 다음에 손댈 때** 고친다(일괄 수정·일괄 배포 안 함).
> 조사: 읽기 전용(코드·마이그레이션 기준, 운영 DB 행 수는 조회 안 함). 경로는 모두 저장소 루트 기준.

## 0. 규칙 한 줄
블로그·인스타·쓰레드·유튜브 등에 **실제로 발행된**(발행 주소·게시 id·발행 상태가 기록된) 콘텐츠는 **발행일로부터 1년**(원고·이미지·영상·음원·발행 기록 모두), 만들기만 한 콘텐츠·예약 대기·실패·결과 불확실은 **생성일로부터 30일**. 관리자·시험 계정(`profiles.retention_exempt`)은 삭제 제외, §8 지정 프로그램은 그 기간(더 길면 긴 쪽).

## 1. 이 세션이 한 것 / 담당이 할 것
| 이 세션이 끝낸 것 | 담당이 할 것 |
|---|---|
| 규칙을 메인 지침·§0·§8에 등록 · 21개 발행형 프로그램 조사(아래 표) · 공용 「내 자료함」은 원본 삭제를 따라가 자동 적용 | 각 프로그램 정리 코드 수정·시험·배포(다음에 손댈 때) · 끝나면 §8 「모든 발행형 프로그램 공통」 줄 비고에 「적용: 프로그램 vX.YY(날짜)」 추가 |

## 2. 먼저 해야 할 급한 것 2가지 (규칙과 정면 충돌 — 다음 손댈 때 최우선)
1. **인스타 계열 게시 직후 사진 삭제**: `insta_auto_poster`(카드뉴스, `src/lib/cardnews/instagram/posts.ts:144`)·`ai-influencer-studio`(`src/app/api/instagram/publish/route.ts:45`, `src/lib/instagram/posting.ts:131`)·`ai-webtoon-studio`·`four-cut-comics`(`src/lib/instagram/posting.ts`)가 게시 성공 즉시 첫 장만 남기고 사진을 지운다 → 발행물 이미지 1년 규칙 위반. 같은 모양 코드(`cleanupOldPosts`·`removeImagesKeepThumb`)라 공용 기준 코드 여부(`SHARED_MODULES.md`) 확인 후 한 번에. **열외(`retention_exempt`)도 네 곳 모두 없음.**
2. **공유 버킷 `post-images` 오삭제**: `threads/src/lib/postImageCleanup.ts:73-92`가 쓰레드 `posts` 표만 보고 `<회원>/` 바로 아래의 「안 쓰이는 파일」을 30일에 지운다 → 같은 위치에 저장하는 `threads-affiliate-poster`·`naver-cafe-poster` 파일까지 지움. 1년 규칙을 넣는 순간 이 두 프로그램 발행 이미지가 사라진다. **쓰레드 담당이 먼저** 세 표(`posts`·`tap_posts`·`ncafe_posts`) 참조를 모아 판단하거나, 프로그램별 하위 폴더로 나눠야 한다. (블로그 두 곳은 하위 폴더라 안전)

## 3. 담당별 요청 표
칸: 발행 표시 = 「발행됨」을 아는 칸 · 지금 = 현재 정리 동작 · 고칠 것 = 권장 방법 · 열외 = `retention_exempt` 제외 여부.

### 블로그 담당 (`docs/roles/blog.md`)
| 프로그램 | 발행 표시 | 정리 코드 | 지금 | 고칠 것 | 열외 |
|---|---|---|---|---|---|
| `ai-auto-blog` | **없음**(`naver_input_status`는 입력 단계까지, `published_at`은 실제로 생성일 `supabase/migration.sql:32`) | `app/api/cron/cleanup-images/route.ts:52-56,117`, `utils/imageRetention.ts` | 생성 30일 일괄 | 확장이 실제 발행 성공(주소·시각)을 돌려주는 칸부터 추가(티스토리 `tistory_publish` 방식) → 발행 1년 / 나머지 30일 | 예 |
| `tistory-auto-blog` | `tistory_publish->>'state'='published'`, `url`, `publishedAt` | `app/api/cron/cleanup-images/route.ts:49-53,108,114` | `published_at`(실제 생성일)로 30일 | 발행 글은 `publishedAt+1년`, 이미지는 그 글 본문이 쓰는 경로 제외 | 예 |
| `naver-blog-agent` | `nba_posts.status`, `published_at`, `post_url` | `src/app/api/cron/cleanup/route.ts` 약 83-92·104-133행 | 발행 무관 30일 | `published_at is null and created_at<30일` OR `published_at<1년`, 발행 글 이미지는 1년 제외(글감 표는 30일 그대로) | 예 |
| `naver-blog-seo-studio` | `seo_report.autoPublish.state='published'`, `url`, `publishedAt` | `lib/draftRetention.ts:50-63` | 생성 30일 | 발행 상태 조건 추가(찾기 쉽게 `published_at` 칸 권장), 예약은 30일 대상 | 예 |
| `naver-blog-allinone`(백업 카테고리) | **없음** | `src/app/api/cron/cleanup/route.ts:31-44` | 생성 30일 | 발행이 에이전트 확장에서 일어나므로 결과를 돌려받는지 먼저 확인 후 결정(미확인) | 예 |
| `wp-blogger-auto` | `status='published'`, `published_at`, `keep_images`, `image_expires_at` | `supabase/migrations/20261111120000_wba_image_retention.sql`, `src/app/api/cron/cleanup` | 구글 블로그 발행 글은 이미지만 1년(본문 30일에 비움), 워드프레스 발행 글 30일 | 발행 글 **원고·기록도 1년**, 워드프레스 발행 글도 `published_at+1년`(이미지는 회원 사이트라 원고·기록만). §8 11-10·11-11 줄과 기본 규칙 정리 | 예 |
| `blog-content-maker` | 서버 기록 없음(확장 `published` 명령만) | 미확인 | — | 서버에 발행물을 보관하지 않으면 해당 없음(확인) | — |

### 쓰레드 계열 (`threads`·`threads-affiliate-poster` 담당 미지정, `threads-content-ops` design)
| 프로그램 | 발행 표시 | 정리 코드 | 지금 | 고칠 것 | 열외 |
|---|---|---|---|---|---|
| `threads` | `posts.status='published'`만(**`published_at` 없음**, `0001_init.sql:57`) | `src/lib/postImageCleanup.ts:50-92` | 게시 글은 생성 30일 뒤 사진만 떼고 기록 무기한, **초안·실패 글은 영원히 남음** | `published_at` 추가·게시 때 기록 → 사진은 발행 1년, 초안·실패 30일 삭제, **2-2 공유 버킷 먼저**(v1.31 「사진만 지우고 기록 유지」는 주인님 결정이었으니 새 규칙과의 관계를 담당이 정리) | 예 |
| `threads-affiliate-poster` | `tap_posts.status`, `published_at` | `src/app/api/cron/cleanup-media/route.ts:39-91` | 생성 30일 전부 | `status<>'published' and created_at<30일` OR `published_at<1년` | 예 |
| `threads-content-ops` | `tco_posts.status` | 글 `lib/contentCleanup.ts:21-24`, 미디어 `lib/mediaCleanup.ts:14-41` | 초안·실패 30일, **발행 글 무기한**, 미디어는 발행 무관 30일 | 발행 글 1년 뒤 삭제 추가, 발행 글 미디어 1년 제외 | 예 |

### 인스타 계열 (담당 미지정 — `insta_auto_poster`는 design 세션이 작업 중)
| 프로그램 | 발행 표시 | 정리 코드 | 지금 | 고칠 것 | 열외 |
|---|---|---|---|---|---|
| `insta_auto_poster` 카드뉴스 | `cns_insta_posts.status`, `published_at`, `permalink` | `src/lib/cardnews/instagram/posts.ts:164-177` | 생성 30일 + **게시 직후 사진 삭제** | 2-1 + `status<>'published' and created_at<30일` OR `published_at<1년` + 열외 | **아니오** |
| `insta_auto_poster` 본 게시글 | `insta_posts.status`, `published_at` | **자동 정리 없음** | 무기한(초안도) | 정리 라우트 신설(초안·실패 30일, 발행 1년, 열외) | — |
| `ai-influencer-studio` · `ai-webtoon-studio` · `four-cut-comics` | `aif_/wts_/fcc_insta_posts.status`, `published_at`, `permalink` | 각 `src/lib/instagram/posting.ts:151-165` | 카드뉴스와 같음(네컷 작품 보관 `src/app/api/cron/cleanup/route.ts`는 발행물 아님 → 30일 유지) | 위와 같음 | **아니오** |

### 영상·음악 (`lyric-video-studio`·`playlist-channel-studio`는 music, `shorts-onestop-studio`는 video)
| 프로그램 | 발행 표시 | 정리 코드 | 지금 | 고칠 것 | 열외 |
|---|---|---|---|---|---|
| `shots` | `shorts_videos.youtube_video_id`, `youtube_uploads`(릴스 기록 미확인) | `src/app/api/cron/cleanup-videos/route.ts:26-86` | 파일 30일, 행 무기한 | 업로드 기록 있는 영상 파일은 업로드 1년, 미업로드 행 30일 — **주인님 결정 필요(용량)** | 예 |
| `shorts-onestop-studio` | `data.youtube`(업로드 기록) | `src/app/api/cron/cleanup-media/route.ts:23-44` | 미디어 30일, 대본 무기한 | 업로드 없으면 30일, 있으면 첫 업로드+1년 | 예 |
| `lyric-video-studio` | **서버 기록 없음**(화면 상태뿐) | pg_cron `lyric-video-studio-retention` | 생성 30일 | 업로드 결과를 항목에 저장(쇼츠 원스톱 방식) 후 조건 분리 | 예 |
| `playlist-channel-studio` | **서버 기록 없음** | **없음** | `playlist_projects` 무기한 | 30일 정리 신설 + 업로드 기록 저장 | — |

### 이커머스·이미지 (`docs/roles/ecommerce-image.md`)
| 프로그램 | 발행 표시 | 정리 코드 | 지금 | 고칠 것 | 열외 |
|---|---|---|---|---|---|
| `smartstore-register` | `status='registered'`, `market_product_no` | `src/app/api/cron/cleanup/route.ts:17-30` | 생성 30일 | 등록 기록 1년(`registered_at` 칸 추가) — **「상품 등록 = 발행」인지 주인님 결정 필요** | 예 |
| `elevenst-register` | `status='registered'`, `elevenst_product_no` | **없음**(주석만 「30일」) | 무기한 | 정리 라우트 신설(등록 1년·나머지 30일, `src/lib/retentionExempt.ts`) | 함수만 |

### 담당 미지정 — 네이버 카페
| 프로그램 | 발행 표시 | 정리 코드 | 지금 | 고칠 것 | 열외 |
|---|---|---|---|---|---|
| `naver-cafe-poster` | `ncafe_posts.status='published'`, `cafe_article_url` | **없음** | 글 무기한, 사진은 **쓰레드 정리가 30일에 지움**(2-2) | 정리 라우트 신설(초안 30일, 발행 1년, 열외), 발행 시각 칸 확인(미확인) | — |

## 4. 공통 주의
- **발행 성공 기록이 먼저**: `ai-auto-blog`·`lyric-video-studio`·`playlist-channel-studio`·`threads`는 「발행됨」을 서버가 알 수 있는 칸부터 만든다. `ai-auto-blog`·`tistory-auto-blog`의 `published_at`은 이름과 달리 **생성일**이라 조건에 쓰면 안 된다.
- **예약 대기**는 발행이 아니다(30일 대상). 다만 `created_at` 기준 정리는 30일 넘게 먼 예약을 실행 전에 지울 수 있으니 「예약 시각이 아직 안 온 글은 제외」를 함께 넣는다(인스타 계열·카드뉴스·`wp-blogger-auto` 지금도 위험).
- **실패·불확실**(`failed`·`uncertain`·`publishing`)은 30일 대상이지만, 「30분 넘게 게시 중 → 실패 처리」 글은 실제로 올라갔을 수 있다 — 지우기 전에 플랫폼 확인 절차가 있는지 점검.
- **원고까지 1년**: 「사진만 떼기」(`threads`)·「본문 비우기」(`wp-blogger-auto`)는 새 규칙(원고·이미지·기록 모두 1년)과 다르다.
- **내 자료함**: 원본 삭제를 따라가므로 따로 할 일 없음(연결된 블로그 6·영상 2는 원본 규칙이 바뀌면 자동으로 1년 표시).

## 5. 주인님 결정이 필요한 것 (요청함 「🙋 내가 해 줄 일」에 올림)
1. `shots`·영상 업로드 완료 파일을 1년 보관할지(유튜브에 원본이 있음 — 저장 용량 비용).
2. `smartstore-register`·`elevenst-register`의 「상품 등록」을 발행으로 보고 1년 보관할지.
3. 경계 사례 — 카카오 알림·단체 발송(`kakao_auto_poster`), 댓글 답글(`youtube-auto-reply`·`instagram-comment-reply`·`threads-comment-reply`·`comment-inbox`)을 「발행」으로 볼지.

## 6. 미확인(담당이 손댈 때 확인)
`naver-blog-allinone` 발행 결과 수신 여부 · `naver-cafe-poster` 발행 시각 칸 · `shots` 릴스 게시 기록 · `blog-content-maker` 서버 저장 · 댓글 답글 3종 정리 코드 · `four-cut-comics` 작품 정리 열외 · 인스타 게시 정리의 공용 기준 코드 등록 여부 · 운영 DB에서 이미 지워진 발행물 여부.

## 7. 제외
`cardnews-studio`(빈 앱, 게시 표는 `insta_auto_poster`가 씀) · `blog_auto_poster`(운영자 전용) · `naver-blog-auto-poster_web`/`_app`(서버 콘텐츠 표 없음, 회원 PC 저장) · 백업 폴더.
