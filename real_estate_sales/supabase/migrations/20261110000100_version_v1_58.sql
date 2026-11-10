-- v1.58 (2026-11-10): 지역 뉴스 알림 지역 번갈아 넣기 · 제목에 지역 이름 있는 기사 우선 · 첫 알림은 건수만 · 네이버 검색 키 매뉴얼 연결. 표 변경 없음.
update public.programs set version = 'v1.58', updated_at = now() where slug = 'real-estate-sales';
