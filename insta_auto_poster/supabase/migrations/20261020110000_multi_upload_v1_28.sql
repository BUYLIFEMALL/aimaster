-- v1.28 (2026-10-20): 직접 첨부 여러 파일 한 번에(카드뉴스 4장), 새 글 주소 postType=card_news. DB 구조 변경 없음 — 버전만.
update public.programs set version = 'v1.28', updated_at = now() where slug = 'auto-instagram-posting';
