-- v1.53 (2026-10-22): 해시태그 수집에 Apify keywordSearch 켬 — 한글 해시태그(#재테크) 빈 결과 해결, 최신 글 대신 반응 좋은 글. 표 구조 변경 없음.
update public.programs set version='v1.53', updated_at=now() where slug='auto-instagram-posting';
