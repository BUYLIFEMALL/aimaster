-- ai-work-workspace v1.11 (2026-10-24): 기본 Gemini 모델 Flash-Lite + 767px 이하 메뉴 접기·표준 메뉴 이름·「내 페이지」 + 모델 목록 회원 키별
update public.programs set version = 'v1.11', updated_at = now() where slug = 'ai-work-workspace';
