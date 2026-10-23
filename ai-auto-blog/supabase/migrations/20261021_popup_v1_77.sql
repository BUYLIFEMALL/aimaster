-- v1.77 네이버 안내·이벤트 팝업 자동 닫기 + 닫지 못하면 15초 뒤 창 이름과 함께 중단 (2026-10-21)
update public.programs set version = 'v1.77', extension_version = 'v1.77', updated_at = now() where slug = 'ai-auto-blog';
