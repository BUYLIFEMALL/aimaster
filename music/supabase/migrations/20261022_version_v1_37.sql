-- 2026-10-22 v1.37: Suno 웹훅 4개가 콜백 본문 대신 회원 키 record-info 재조회 결과로만 저장(D-68-01).
update public.programs set version = 'v1.37', updated_at = now() where slug = 'music-automation';
