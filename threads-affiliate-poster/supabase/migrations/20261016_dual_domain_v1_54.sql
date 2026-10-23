-- v1.54 (2026-10-16): 옛 vercel.app 삭제 대비 — 콜백 두 주소 지원·연결 후 이동 새 주소·독립 배포본 옛 주소 이동 제외
update public.programs set version='v1.54', updated_at=now() where slug='threads-affiliate-poster';
