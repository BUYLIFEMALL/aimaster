-- v1.69 (2026-10-20): 글 모델 선택 칸에 모델 성격 표시(⚡ 빠름·⚖️ 균형·💎 고품질), 공용 기준 코드 openAIModelTier
update public.programs set version = 'v1.69', updated_at = now() where slug = 'threads-affiliate-poster';
