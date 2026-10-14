-- 2026-10-14 v1.03: 모바일(767px 이하) 셸 CSS 누락 수정 — 좌측 메뉴 대신 위쪽 접는 메뉴(코드만, 스키마 변경 없음)
update programs set version = 'v1.03', updated_at = now() where slug = 'four-cut-comics';
