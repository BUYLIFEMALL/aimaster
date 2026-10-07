-- naver-blog-agent v1.16: 글감 보관함 하단 액션 버튼 색상 개편 (사용완료 파란색 바탕, 보관 초록색 바탕)
UPDATE public.programs
SET version = 'v1.16',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
