-- v1.51 (2026-10-22): 해시태그 수집을 Apify 전용 수집기(apify~instagram-hashtag-scraper)로 — 범용 수집기에 해시태그 주소를 넣으면 no_items. 오류 항목만 오면 이유 안내. 표 구조 변경 없음.
update public.programs set version='v1.51', updated_at=now() where slug='auto-instagram-posting';
