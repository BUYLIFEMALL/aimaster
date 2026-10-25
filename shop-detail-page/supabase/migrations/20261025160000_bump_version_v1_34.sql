-- AI 상세페이지 자동화 v1.34 버전 갱신 (API키 2단 퀵액션 버튼 세트 및 3D 엠보싱 버튼 표준 규격 적용)
INSERT INTO public.programs (name, version, updated_at)
VALUES ('shop-detail-page', 'v1.34', NOW())
ON CONFLICT (name) DO UPDATE
SET version = EXCLUDED.version,
    updated_at = EXCLUDED.updated_at;
