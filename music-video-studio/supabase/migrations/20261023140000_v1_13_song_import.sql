-- v1.13 (2026-10-23): 1단계에 「이 뮤직비디오의 곡」 — AI 음악 스튜디오 내 곡 가져오기 + 내 음악 파일 올리기(브라우저에만 보관). DB 구조 변경 없음, 버전만.
update programs set version = 'v1.13', updated_at = now() where slug = 'music-video-studio';
