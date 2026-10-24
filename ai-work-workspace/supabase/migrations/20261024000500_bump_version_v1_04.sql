-- ai-work-workspace v1.04 (2026-10-24): U1 이름 바꾸기(AI 비서·메뉴 이름) + U2 불필요한 기능 숨기기
update public.programs set version = 'v1.04', updated_at = now() where slug = 'ai-work-workspace';
