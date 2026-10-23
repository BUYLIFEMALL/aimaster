-- naver-blog-agent v1.27 버전 업: 연동 & 사용 매뉴얼(/guide) 전면 최신화 (글감 수집소, 멀티 AI 텍스트/이미지 스튜디오, 스마트 에디터 원고 편집, 30일 보관 정책, 계정 관리 등 최신 구현 기능 종합 반영)
UPDATE public.programs
SET version = 'v1.27', updated_at = NOW()
WHERE slug = 'naver-blog-agent';
