-- v1.55 (2026-10-22): Gemini가 아닌 분석 AI(OpenAI·Claude)에서 수집한 릴스 「🎙 말소리까지 분석」 — 회원 본인 OpenAI 키로 mp4를 그대로 받아쓰기(whisper-1, 25MB까지, 저장 안 함). 표 구조 변경 없음.
update public.programs set version='v1.55', updated_at=now() where slug='auto-instagram-posting';
