-- B5: 한국 시간 현재 월 프롬프트 규칙 반영 버전
update public.programs set version = 'v1.02', updated_at = now() where slug = 'prompt-template-studio';
