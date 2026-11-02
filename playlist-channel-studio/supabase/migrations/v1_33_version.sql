-- v1.33 플랫폼별 최신 AI 모델 추가(텍스트 9개·이미지 6개, 순서 OpenAI·Claude·Gemini, 기본 텍스트 gemini-3.8-flash) (2026-11-03)
update public.programs set version = 'v1.33', updated_at = now() where slug = 'playlist-channel-studio';
