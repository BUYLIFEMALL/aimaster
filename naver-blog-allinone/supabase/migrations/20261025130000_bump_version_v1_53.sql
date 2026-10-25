-- 네이버 블로그 올인원 v1.53 버전 갱신 (사이드바 3D 확장 다운로드 버튼 탑재 & 4대 플랫폼 2단 퀵액션 버튼 세트 및 럭셔리 매뉴얼 3D 배너 업그레이드)
INSERT INTO public.programs (name, version, updated_at)
VALUES ('naver-blog-allinone', 'v1.53', NOW())
ON CONFLICT (name) DO UPDATE
SET version = EXCLUDED.version,
    updated_at = EXCLUDED.updated_at;
