# 권한 판정 동시 조회 전체 반영 (2026-11-06)

> 주인님 결정(요청함 A-7, 2026-11-06 채팅 「권한 판정 속도 개선 추천대로 진행해」): 회원 권한 판정 코드의 순차 조회 4회를 **두 묶음 동시 조회**로 바꾼다. 판정 순서·결과는 그대로이고 첫 화면 응답만 빨라진다. **따로 배포하지 않고 각 프로그램을 다음에 배포할 때 함께 나간다**(빌드 비용 추가 없음). 기준: `free-music-studio/src/lib/programAccess.ts`(커밋 `ac1c214aa`, 가짜 DB 시험 `free-music-studio/tests/access.test.mjs`).

## 바꾸는 내용
- 첫 묶음: `profiles`(관리자·정지·핸드폰·등급) + `programs`(배지·최소 등급) 동시 조회
- 둘째 묶음: `subscriptions` + `user_program_access` 동시 조회(프로그램 id가 필요해서 첫 묶음 뒤)
- 그 아래 판정 순서(정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+사용기간)는 한 글자도 바꾸지 않음

## 이번에 바꾼 파일 (56개, 미배포 대기)
고치기 전 `free-music-studio` 코드와 글자까지 같은 묶음만 스크립트로 바꿨다(파일마다 -24줄 +18줄로 동일). 타입 검사: ai-auto-blog·insta_auto_poster·threads-content-ops·ai-doc-chatbot·trending-product-finder 판정 파일 오류 0.

- `ai-audio-analyzer/src/lib/programAccess.ts`
- `ai-auto-blog/lib/access/checkProgramAccess.ts`
- `ai-doc-chatbot/src/lib/programAccess.ts`
- `ai-influencer-studio/src/lib/programAccess.ts`
- `ai-mastering-studio/src/lib/programAccess.ts`
- `ai-prompt-studio/src/lib/programAccess.ts`
- `ai-task-planner/src/lib/programAccess.ts`
- `ai-webtoon-studio/src/lib/programAccess.ts`
- `ai-writing-editor/src/lib/programAccess.ts`
- `banana-canvas/src/lib/programAccess.ts`
- `blog-content-maker/src/lib/programAccess.ts`
- `blog-keyword/src/lib/programAccess.ts`
- `blog-neighbor-care/src/lib/programAccess.ts`
- `blog-workroom/src/lib/programAccess.ts`
- `booking-reminder/lib/programAccess.ts`
- `cinematic-storyboard-studio/src/lib/programAccess.ts`
- `comment-inbox/lib/programAccess.ts`
- `crm-google-form/lib/programAccess.ts`
- `ebook-studio/src/lib/programAccess.ts`
- `fashion-style/src/lib/programAccess.ts`
- `file-merge/src/lib/programAccess.ts`
- `four-cut-comics/src/lib/programAccess.ts`
- `ghost-scraper/src/lib/programAccess.ts`
- `image-convert-studio/src/lib/programAccess.ts`
- `infinite-loop-video/src/lib/programAccess.ts`
- `insta_auto_poster/src/lib/cardnews/programAccess.ts`
- `kakao_auto_poster/src/lib/programAccess.ts`
- `landing-architect/src/lib/programAccess.ts`
- `lyric-video-studio/src/lib/programAccess.ts`
- `markdown-studio/src/lib/programAccess.ts`
- `music-player/src/lib/programAccess.ts`
- `music-video-studio/src/lib/programAccess.ts`
- `naver-blog-allinone/src/lib/programAccess.ts`
- `naver-blog-auto-poster_app/web/lib/access/checkProgramAccess.ts`
- `naver-blog-auto-poster_web/web/lib/access/checkProgramAccess.ts`
- `naver-cafe-poster/src/lib/programAccess.ts`
- `persona-style-studio/src/lib/programAccess.ts`
- `personality-suite/src/lib/programAccess.ts`
- `photo-remake-studio/src/lib/programAccess.ts`
- `playlist-channel-studio/src/lib/programAccess.ts`
- `portrait-photo/src/lib/programAccess.ts`
- `reverse-prompt/src/lib/programAccess.ts`
- `seller-label-docs/src/lib/programAccess.ts`
- `shop-order-report/src/lib/programAccess.ts`
- `shorts-onestop-studio/src/lib/programAccess.ts`
- `smartstore-register/src/lib/programAccess.ts`
- `stepmail/lib/programAccess.ts`
- `style-dna-analyzer/src/lib/programAccess.ts`
- `threads-content-ops/lib/access/checkProgramAccess.ts`
- `thumbnail-master/src/lib/programAccess.ts`
- `tistory-auto-blog/lib/access/checkProgramAccess.ts`
- `trending-product-finder/lib/programAccess.ts`
- `ui-canvas/src/lib/programAccess.ts`
- `vinyl-lp-studio/src/lib/programAccess.ts`
- `youtube-auto-reply/lib/programAccess.ts`
- `youtube-viral-studio/src/lib/programAccess.ts`
## 이번에 건너뛴 파일 (다른 세션 작업 중 또는 메인 사이트)
- ✅ 2026-11-08 반영(주인님 「루트만 고쳐 두고 각 프로그램은 다음에 손댈 때」): `lib/access/checkProgramAccess.ts` 두 묶음 동시 조회로 — 메인 빌드 1회. 각 프로그램 사본은 그 프로그램을 다음에 손댈 때 같은 블록으로. (옛 메모) `lib/access/checkProgramAccess.ts` — 루트 메인 사이트 기준. 고쳐서 푸시하면 메인 사이트 빌드가 바로 돌아 비용이 생기므로, 메인 사이트를 다음에 고칠 때 같은 블록으로 바꾼다.
- `ai-work-workspace/`·`instagram-comment-reply/`·`threads-comment-reply/`·`shorts-viral-studio/` — 2026-11-06 작업 중 표에 다른 세션 줄이 있어 손대지 않음. 그 세션이 끝난 뒤 같은 방식으로.

## 모양이 달라 손으로 바꿀 후보
코드 모양이 프로그램마다 달라 스크립트로 바꾸지 않았다. 그 프로그램을 고칠 때 기준 파일을 보고 같은 두 묶음으로 바꾸고, 판정 순서는 건드리지 않는다. (아래에는 판정 함수가 아닌 파일 — 관리자 화면 API·이미 일괄 조회하는 `accessBatch.ts` 등 — 도 섞여 있다.)

- `ai-image-studio/lib/access/checkProgramAccess.ts`
- `ai-music-studio/lib/access/checkProgramAccess.ts`
- `ai-slide-builder/src/lib/programAccess.ts`
- `ai-video-studio/lib/access/checkProgramAccess.ts`
- `allinone-graphic/src/lib/programAccess.ts`
- `app/api/admin/grade-access/route.ts`
- `app/api/admin/user-access/route.ts`
- `booking-reminder/lib/access.ts`
- `comment-inbox/lib/access.ts`
- `commercial-land-trade-alert/src/lib/accessBatch.ts`
- `competitor-analysis/lib/access.ts`
- `coupang-ops/src/lib/programAccess.ts`
- `crm-google-form/lib/access.ts`
- `document-translator/src/lib/programAccess.ts`
- `emotion-writer/src/lib/programAccess.ts`
- `free-music-studio/src/lib/programAccess.ts`
- `insta_auto_poster/src/lib/access.ts`
- `instagram-comment-reply/lib/access.ts`
- `instagram-comment-reply/lib/dmApp/access.ts`
- `kakao_auto_poster/src/lib/access.ts`
- `lib/access/getProgramAccessMap.ts`
- `longtail-keyword-expander/lib/access.ts`
- `mbti-character/lib/access.ts`
- `mbti/lib/access.ts`
- `music/lib/access.ts`
- `naver-blog-agent/src/lib/access.ts`
- `naver-blog-allinone/src/lib/access.ts`
- `naver-blog-seo-studio/lib/access.ts`
- `naver-blog-seo-studio/lib/extensionAuth.ts`
- `naver-cafe-poster/src/lib/access.ts`
- `naver-cafe-recruit/src/lib/access.ts`
- `prompt-template-studio/src/lib/programAccess.ts`
- `react-ui-showcase/src/lib/programAccess.ts`
- `real_estate_sales/src/lib/access.ts`
- `real_estate_sales/src/lib/accessBatch.ts`
- `realty-client-desk/src/lib/accessBatch.ts`
- `realty-listing-alert/lib/access.ts`
- `realty-listing-alert/lib/extensionAuth.ts`
- `shop-detail-page/lib/access.ts`
- `shots/src/lib/access.ts`
- `stepmail/lib/access.ts`
- `tarot/lib/access.ts`
- `threads-affiliate-poster/src/lib/access.ts`
- `threads-comment-reply/lib/access.ts`
- `threads-easy-planner/src/lib/access.ts`
- `threads/src/lib/access.ts`
- `trending-product-finder/lib/access.ts`
- `video-to-gif/lib/access.ts`
- `web-crawler/webapp/src/lib/access.ts`
- `youtube-auto-reply/lib/access.ts`