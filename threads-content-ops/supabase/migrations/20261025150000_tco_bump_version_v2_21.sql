-- Threads 콘텐츠 운영 자동화 v2.21 버전 갱신 (사이드바 3D 다운로드/연동 버튼 탑재 & 13대 플랫폼 2단 퀵액션 버튼 세트 및 럭셔리 매뉴얼 3D 배너 업그레이드)
INSERT INTO public.programs (name, version, updated_at)
VALUES ('threads-content-ops', 'v2.21', NOW())
ON CONFLICT (name) DO UPDATE
SET version = EXCLUDED.version,
    updated_at = EXCLUDED.updated_at;
