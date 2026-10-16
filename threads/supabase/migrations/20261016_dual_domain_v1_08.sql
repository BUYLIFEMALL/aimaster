-- v1.08 (2026-10-16): 옛 vercel.app 삭제 대비 — 콜백 두 주소 지원·연결 후 이동 새 주소 기준
update public.programs set version='v1.08', updated_at=now() where slug='auto-threads-posting';
