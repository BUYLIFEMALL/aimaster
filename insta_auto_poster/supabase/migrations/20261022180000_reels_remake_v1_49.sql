-- v1.49 (2026-10-22): 떡상 리메이크에 릴스 영상 파일 올리기(브라우저에서 장면 4장·소리 WAV만 뽑아 분석, Gemini는 소리까지). 표 구조 변경 없음.
update public.programs set version='v1.49', updated_at=now() where slug='auto-instagram-posting';
