-- 2026-10-22 v1.41: 임시 보관 표시를 12트랙·Suno 커버·영상까지, 50MB 초과 안내(프로젝트 업로드 한도 원인).
update public.programs set version = 'v1.41', updated_at = now() where slug = 'music-automation';
