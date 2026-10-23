-- v1.10 (2026-10-16): 옛 vercel.app 삭제 대비 — Suno 콜백 주소를 새 주소 기준으로
update public.programs set version='v1.10', updated_at=now() where slug='music-automation';
