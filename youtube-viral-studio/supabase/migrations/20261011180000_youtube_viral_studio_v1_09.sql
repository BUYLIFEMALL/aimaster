-- YOUTUBE VIRAL FINDER v1.09 (2026-10-11)
-- 코드 변경: 모든 /api/youtube/*·/api/settings/api-keys 가 로그인뿐 아니라 프로그램 이용 권한(checkProgramAccessApi)도 확인,
--           Claude 키 provider 이름을 DB 체크 제약(anthropic)에 맞춤. DB 구조 변경 없음, 버전만 갱신.
UPDATE public.programs SET version = 'v1.09', updated_at = NOW() WHERE slug = 'youtube-viral-studio';
