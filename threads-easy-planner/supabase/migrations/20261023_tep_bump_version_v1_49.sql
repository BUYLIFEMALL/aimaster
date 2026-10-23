-- Threads AI 기획 자동화 v1.49 (2026-10-23): 운영에서 이미지 기능 숨김(배포판만 유지, 주인님 지시) + 배포판 이름 ALLA AI 코드(독립 모드 전용)
UPDATE public.programs
SET version = 'v1.49', updated_at = NOW()
WHERE slug = 'threads-easy-planner';
