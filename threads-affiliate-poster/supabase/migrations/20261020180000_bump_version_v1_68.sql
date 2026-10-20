-- v1.68 (2026-10-20): OpenAI 모델별 요청 규칙을 공용 기준 코드 openai-request-params 사본으로, GPT-5·GPT-6 선택 시 응답 지연 안내
update public.programs set version = 'v1.68', updated_at = now() where slug = 'threads-affiliate-poster';
