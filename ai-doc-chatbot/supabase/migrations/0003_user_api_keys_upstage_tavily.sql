-- 2026-10-19: AI 문서 챗봇(ai-doc-chatbot) 설정 화면에서 키 저장 시
--   new row for relation "user_api_keys" violates check constraint "user_api_keys_provider_check"
-- 오류가 났다. 공용 user_api_keys.provider 허용 목록에 'upstage'·'tavily'가 없었기 때문(v1.01 등록 때 누락).
-- 다른 CLI가 0037 이후 목록을 바꿨을 수 있으므로, 운영 DB의 현재 목록을 그대로 읽어 두 값만 더한다.
-- 대상: 운영 DB esgxyikcnnvmlhygjkth. 기존 데이터는 건드리지 않는다.

DO $$
DECLARE
  vals text[];
BEGIN
  SELECT array_agg(DISTINCT m[1]) INTO vals
  FROM pg_constraint c,
       regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g') AS m
  WHERE c.conname = 'user_api_keys_provider_check'
    AND c.conrelid = 'public.user_api_keys'::regclass;

  IF vals IS NULL THEN
    RAISE EXCEPTION 'user_api_keys_provider_check 제약을 찾지 못했습니다';
  END IF;

  vals := ARRAY(SELECT DISTINCT unnest(vals || ARRAY['upstage', 'tavily']) ORDER BY 1);

  ALTER TABLE public.user_api_keys DROP CONSTRAINT user_api_keys_provider_check;
  EXECUTE format(
    'ALTER TABLE public.user_api_keys ADD CONSTRAINT user_api_keys_provider_check CHECK (provider = ANY (%L::text[]))',
    vals
  );
END $$;

-- 확인용: 아래 결과에 upstage, tavily가 보이면 성공
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'user_api_keys_provider_check';
