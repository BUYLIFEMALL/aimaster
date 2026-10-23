# 2026-10-22 인수인계 — v1.76 대시보드 「📊 최근 7일 게시」 그래프 (Claude Code 윈도우)

> `AGENTS.md`에 다른 작업자의 미커밋 변경(2026-10-20부터)이 있어 그 파일은 건드리지 않고 이 문서에 기록했다. 다음에 `AGENTS.md`를 정리하는 CLI가 버전 기록(4번 항목)에 v1.76 한 줄을 옮겨 주면 된다.

- 무엇: 상태 통계 카드 아래에 공용 기준 코드 `week-reply-chart` 사본(`src/components/weekChart/WeekReplyChart.tsx`·`src/lib/weekChart/bucket.ts`, 기준 `comment-inbox` — 직접 고치지 말고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`). 대시보드가 이미 읽는 본인 `tap_posts` 중 status=published 글을 한국 시간 날짜별로 셈(추가 조회 없음). 제목 「📊 최근 7일 게시」, 흐름 문장 「게시가 늘고/줄고 있어요」.
- 한계: 게시 시각 전용 칸이 없어 `updated_at`(수정 때 트리거 자동 갱신)을 게시 시각으로 씀 → 게시 뒤 다시 수정한 글은 수정한 날로 옮겨 셈. 정확히 하려면 `published_at` 칸 추가(DB 구조 변경 — 주인님 사전 승인 필요).
- 검수: tsc·build(종료 코드 0), 커밋 `10835a02`, 배포 `threads-affiliate-poster-lttj2qite` READY, DB v1.76, 크롬에서 v1.76·그래프·「아직 게시 기록이 없어요」, 400px 가로 넘침 없음. 기록 0건이라 높이 있는 막대는 미확인. 비용: Vercel 빌드 1회.
- 다음 첫 단계: `published_at` 칸 추가 여부를 주인님께 확인 → 추가하면 `src/lib/posts/publish-core.ts` 게시 완료 수정에 `published_at`을 넣고 대시보드 집계를 그 칸으로 바꾼다.
- 프로그램: https://threads-affiliate-poster.buylife.xyz

## v1.77 — 게시 시각 칸(published_at) · 막대 누르면 그날 게시한 글 (Claude Code 윈도우, 같은 날)
- **DB(주인님 승인, 운영 `esgxyikcnnvmlhygjkth`)**: `tap_posts.published_at timestamptz` 추가. 기존 게시 10건은 그때의 `updated_at`으로 채움 — 채우는 동안 `tap_posts_set_updated_at` 트리거를 잠깐 꺼 `updated_at`은 그대로(검증: 게시 10 = 채움 10 = 「게시 시각 = 수정 시각」 10). 기록 `supabase/migrations/20261022100000_tap_posts_published_at.sql`, 형식 정의 `src/types/database.types.ts`.
- 게시 완료 때 기록(`src/lib/posts/publish-core.ts`), 대시보드 그래프는 `published_at`(비어 있으면 `updated_at`) 기준 — 위 v1.76의 「한계」는 해결됨.
- 막대 누르면 그날 게시한 글: 공용 기준 코드 `week-reply-panel` 사본 `src/components/weekChart/WeekReplyPanel.tsx` + 서버 동작 `src/lib/actions/weekPosts.ts` `loadWeekDayPostsAction`(이용 권한 확인 → 회원 세션·user_id·게시 완료·`published_at` 그날 범위·최근 50건, 본문 앞 80자, 누르면 쓰레드 게시물 주소). 문구는 대시보드 `WEEK_POST_LABELS`.
- 검수: tsc·build(종료 코드 0), 커밋 `622694bc`·`b0a779f0`·`173db0d8`, 배포 `threads-affiliate-poster-r0ne9up4b` READY, DB v1.77, 크롬(관리자)에서 v1.77·막대 누르면 「이날 게시한 글이 없어요」 오류 없음. 관리자 최근 7일 게시 0건이라 목록 항목 모양은 미확인. 비용: Vercel 빌드 1회.
- 미배포(다음 배포 때 함께): 막대 숨겨진 설명 문구(커밋 `6c2d922d`).
- `AGENTS.md` 버전 기록(4번)에 v1.76·v1.77 두 줄을 옮겨 줄 것(다른 작업자 미커밋 변경이 정리된 뒤).
- 같은 날 보완(커밋 `21280e5f`, 미배포·동작 같음): 게시 완료 저장에서 `published_at` 칸이 없다는 오류면 칸을 빼고 다시 저장. 이 프로그램 `KIT/database`에는 `tap_posts` 표 자체가 없어(다른 구성) 키트 SQL은 고치지 않음 — 키트를 정비할 때 함께 확인.

## v1.78 — 그날 목록 썸네일 (Claude Code 윈도우, 같은 날)
- `src/lib/actions/weekPosts.ts`가 `image_url`(쉼표로 이어진 공개 주소)의 첫 장을 썸네일로(`publicImageUrl`, 실제 주소 200 확인). 커밋 `3e7ecf43`, 배포 `threads-affiliate-poster-lkwr1fvyn` READY, DB v1.78. 비용: Vercel 빌드 1회.
- 미배포(다음 배포 때 함께): 공용 그날 목록의 「이미지가 안 열리면 썸네일 숨김」(커밋 `bf0b8479`).

## v1.79 — 7일 그래프 글자 크게 (Claude Code 윈도우, 같은 날)
- 주인님 「글자가 잘 안보여 조금 더 키워줘」. 공용 기준 `comment-inbox/components/weekChart/WeekReplyChart.tsx`·`WeekReplyPanel.tsx`에서 제목 14→16px, 합계 줄 12→14px, 막대 위 건수 11→14px, 날짜·요일 10→12px, 흐린 글자 투명도 60→80%, 그날 목록 글자도 한 단계씩. 커밋 `9479f0bc`, 배포 `threads-affiliate-poster-r7tkatxv1` READY, DB v1.79, 크롬에서 실제 글자 크기 확인. 비용: Vercel 빌드 1회.
- 같은 사본을 쓰는 받은편지함·세 댓글 프로그램·INSTA 포스팅·AI 인플루언서·웹툰은 저장소에만 반영(미배포) — 다음 배포 때 함께 나감.

## v1.81 — 상세페이지 섹션 이미지 가져오기 (Claude Code 맥미니, 같은 날 · 배포 대기)
- 내용: `AGENTS.md` 2026-10-22 v1.81. 보내는 쪽: `shop-detail-page/lib/threadsLink.ts`(v1.19).
- **윈도우 CLI 다음 첫 단계**: `shop-detail-page` v1.19 배포가 Ready가 된 뒤 순차로 ① SQL `supabase/migrations/20261022200000_bump_version_v1_81.sql` ② `npx tsc --noEmit`·`npm run build` 후 배포 ③ 크롬: 상세페이지 상품 화면에서 완료된 섹션의 「🧵 쓰레드 홍보글」 → 새 창 `/posts/new`에 초록 안내·이미지 1장·본문 초안(상품명·특징), 새로고침해도 이미지 1장 그대로 / 주소의 `shopImage` 앞부분을 다른 회원 ID로 바꾸면 빨간 안내 「본인이 만든 상세페이지 이미지만…」. 게시·AI 생성 버튼은 누르지 않는다(비용·외부 공개).
- 프로그램: https://threads-affiliate-poster.buylife.xyz
