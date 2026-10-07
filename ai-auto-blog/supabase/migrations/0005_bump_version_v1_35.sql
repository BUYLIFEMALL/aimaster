-- ai-auto-blog v1.35: 실시간 본문 및 이미지 생성 검토 & 블록 편집기(Content Block Editor) 탑재
UPDATE public.programs
SET version = 'v1.35',
    updated_at = NOW()
WHERE slug = 'ai-auto-blog';
