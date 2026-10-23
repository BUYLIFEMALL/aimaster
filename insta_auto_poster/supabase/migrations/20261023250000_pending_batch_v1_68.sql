-- v1.68 (2026-10-23): 모아 둔 수정 배포 — 「🔤 영어로」 전 검색어를 한글 있을 때만 기억(4bebfb016), 글 양식 「✕ 슬라이드 N 빼기」(447780d5c), 공용 사본(member-scheduler·instagram-publish, 동작 같음).
update public.programs set version = 'v1.68', updated_at = now() where slug = 'auto-instagram-posting';
