-- 2026-10-21 v1.20: music-audio 비공개 + 서명 주소(0014). 
update programs set version = 'v1.20', updated_at = now() where slug = 'music-automation';
