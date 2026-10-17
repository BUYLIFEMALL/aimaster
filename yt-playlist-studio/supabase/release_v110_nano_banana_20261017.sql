-- 2026-10-17 v1.10: AI 배경 생성 모델 교체(Imagen 종료 → gemini-nano-banana-2.1, 기본 16:9 2K, DB 구조 변경 없음)
update programs set version = 'v1.10', updated_at = now() where slug = 'yt-playlist-studio';
