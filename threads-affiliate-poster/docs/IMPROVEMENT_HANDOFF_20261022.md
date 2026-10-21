# 2026-10-22 인수인계 — v1.76 대시보드 「📊 최근 7일 게시」 그래프 (Claude Code 윈도우)

> `AGENTS.md`에 다른 작업자의 미커밋 변경(2026-10-20부터)이 있어 그 파일은 건드리지 않고 이 문서에 기록했다. 다음에 `AGENTS.md`를 정리하는 CLI가 버전 기록(4번 항목)에 v1.76 한 줄을 옮겨 주면 된다.

- 무엇: 상태 통계 카드 아래에 공용 기준 코드 `week-reply-chart` 사본(`src/components/weekChart/WeekReplyChart.tsx`·`src/lib/weekChart/bucket.ts`, 기준 `comment-inbox` — 직접 고치지 말고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`). 대시보드가 이미 읽는 본인 `tap_posts` 중 status=published 글을 한국 시간 날짜별로 셈(추가 조회 없음). 제목 「📊 최근 7일 게시」, 흐름 문장 「게시가 늘고/줄고 있어요」.
- 한계: 게시 시각 전용 칸이 없어 `updated_at`(수정 때 트리거 자동 갱신)을 게시 시각으로 씀 → 게시 뒤 다시 수정한 글은 수정한 날로 옮겨 셈. 정확히 하려면 `published_at` 칸 추가(DB 구조 변경 — 주인님 사전 승인 필요).
- 검수: tsc·build(종료 코드 0), 커밋 `10835a02`, 배포 `threads-affiliate-poster-lttj2qite` READY, DB v1.76, 크롬에서 v1.76·그래프·「아직 게시 기록이 없어요」, 400px 가로 넘침 없음. 기록 0건이라 높이 있는 막대는 미확인. 비용: Vercel 빌드 1회.
- 다음 첫 단계: `published_at` 칸 추가 여부를 주인님께 확인 → 추가하면 `src/lib/posts/publish-core.ts` 게시 완료 수정에 `published_at`을 넣고 대시보드 집계를 그 칸으로 바꾼다.
- 프로그램: https://threads-affiliate-poster.buylife.xyz
