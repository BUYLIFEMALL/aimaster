# 2026-10-22 플랜 — 정리 기록 · 정리된 장면 표시 (shots v1.37) + 메인 관리자 합계 + 썸네일 쇼츠 표지 안내

주인님 승인: 「승인, 세 개 차례로」(shots v1.37 → 메인 관리자 → 썸네일 v1.19, 빌드 3회, AI 0회, DB 칸 추가 없음).

| 항목 | 내용 |
|---|---|
| 방식 | DB 칸 추가 대신 기존 공용 `usage_logs`에 회원별 `cleanup_expired` 1건(quantity=지운 총수, metadata `{videos, voices, covers, images, segments:[장면 id]}`). 관리자 통계(`app/admin/statistics`)는 정해진 action만 세므로 영향 없음 |
| shots | `/api/cron/cleanup-videos` 끝에서 회원별 기록(미리보기 `?dry=1` 때는 안 남김). 스크립트 화면이 이미지 빈 장면 중 기록에 있는 장면에 「이 장면 이미지는 만든 지 30일이 지나 정리됐습니다 — 위에서 다시 생성해 주세요」 |
| 시점 | 첫 실삭제(2026-10-22 18:30 UTC) 전에 배포해 첫 삭제부터 기록 |
