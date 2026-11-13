-- v1.14 (2026-11-13, 음악 담당): 채널 로고·프레임 + 유튜브 제목·설명 AI 제안(회원 본인 키). 표 변경 없음.
update public.programs set version = 'v1.14', updated_at = now() where slug = 'lyric-video-studio';
