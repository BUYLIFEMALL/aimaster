-- ai-work-workspace v1.14 (2026-10-24): Gemini 기본을 쓸 수 있는 최신 Flash-Lite로 되돌림(2.5 Flash-Lite는 새 사용자 차단) + 차단 모델 한국어 안내
update public.programs set version = 'v1.14', updated_at = now() where slug = 'ai-work-workspace';
