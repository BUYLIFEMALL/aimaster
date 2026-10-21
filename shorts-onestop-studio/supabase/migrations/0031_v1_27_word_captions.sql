-- v1.27 (2026-10-22): 단어 단위 자막(장면 음성에 낱말 시작 시각 words 저장, ElevenLabs with-timestamps · 그 밖은 회원 OpenAI Whisper). 표 구조 변경 없음 — 버전만
update public.programs set version='v1.27', updated_at=now() where slug='shorts-onestop-studio';
