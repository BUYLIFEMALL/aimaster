-- threads-content-ops v1.70: 파란색 이미지 생성 버튼 및 각 콘텐츠별 생성 이미지 직관적 미리보기/관리 UI 적용
UPDATE public.programs
SET version = 'v1.70',
    updated_at = NOW()
WHERE slug = 'threads-content-ops';
