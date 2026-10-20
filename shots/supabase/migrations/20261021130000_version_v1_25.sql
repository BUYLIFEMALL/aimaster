-- v1.25 (2026-10-21): 브라우저에서 만들기 — 장면 음성·이미지 동시 준비, 영상 4Mbps(50초 약 32MB → 저장 한도 여유). 버전만
update public.programs set version='v1.25', updated_at=now() where slug='auto-shorts-posting';
