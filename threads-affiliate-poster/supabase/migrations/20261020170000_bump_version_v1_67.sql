-- v1.67 (2026-10-20): GPT-5.x·GPT-6 모델로 홍보 글 생성 시 max_tokens 거부(400) 수정 — 추론 모델은 max_completion_tokens 4000
update public.programs set version = 'v1.67', updated_at = now() where slug = 'threads-affiliate-poster';
