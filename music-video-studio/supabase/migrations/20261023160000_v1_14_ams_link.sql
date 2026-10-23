-- v1.14 (2026-10-23): AI 음악 스튜디오 곡 링크(/music?ams=)로 오면 곡을 바로 가져옴. DB 구조 변경 없음, 버전만.
update programs set version = 'v1.14', updated_at = now() where slug = 'music-video-studio';
