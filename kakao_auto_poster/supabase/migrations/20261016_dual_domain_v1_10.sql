-- v1.10 (2026-10-16): 옛 vercel.app 삭제 대비 — 카카오 콜백 두 주소 지원·텔레그램 웹훅 새 주소(메시지 링크 기준은 회원 공지 후 전환)
update public.programs set version='v1.10', updated_at=now() where slug='kakao-auto-posting';
