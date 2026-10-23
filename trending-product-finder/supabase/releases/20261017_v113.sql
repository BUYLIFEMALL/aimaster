-- 2026-10-17 v1.13: 생성 자료 30일 자동 삭제 Cron(cleanup-generated, 03:50 KST)·화면 만료 자료 숨김 (DB 구조 변경 없음, 주인님 승인)
update programs set version = 'v1.13', updated_at = now() where slug = 'trending-product-finder';
