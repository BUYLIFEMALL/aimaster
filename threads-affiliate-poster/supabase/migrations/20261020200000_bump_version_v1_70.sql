-- v1.70 (2026-10-20): 모델 성격 표시에 한 줄 설명(마우스 올리기·누르기), 공용 기준 코드 openAIModelTierHint
update public.programs set version = 'v1.70', updated_at = now() where slug = 'threads-affiliate-poster';
