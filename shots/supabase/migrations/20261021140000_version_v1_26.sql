-- v1.26 (2026-10-21): 브라우저에서 만들기 — 음성 요청 30초 제한 + 1번 다시 시도(가끔 한 장면만 60~90초 지연), 서버는 브라우저가 끊으면 OpenAI 요청도 중단. 버전만
update public.programs set version='v1.26', updated_at=now() where slug='auto-shorts-posting';
