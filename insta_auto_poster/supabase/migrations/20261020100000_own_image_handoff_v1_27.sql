-- v1.27 (2026-10-20): 새 글 화면에서 AI 생성 없이 내 이미지·캡션으로 바로 저장(4컷 만화 넘겨받기). DB 구조 변경 없음 — 버전만.
update public.programs set version = 'v1.27', updated_at = now() where slug = 'auto-instagram-posting';
