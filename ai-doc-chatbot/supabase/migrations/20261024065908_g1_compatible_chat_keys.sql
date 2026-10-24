-- AIMaster 운영 DB esgxyikcnnvmlhygjkth 전용. G-1, 2026-10-24.
-- CLI migration new로 생성 후 MCP 적용 이력 20261024065908에 파일명을 맞춤.
-- 기존 CHECK 식을 그대로 OR 확장한다. 과거 provider 목록을 재작성하거나 회원 키를 수정하지 않는다.
-- NVIDIA는 카탈로그 비활성만 등록하며 provider 허용/키 등록/운영 호출은 열지 않는다.
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';
DO $g1$
DECLARE
  old_expression text;
  provider_number smallint;
  already_allowed boolean;
  additions text[] := ARRAY['groq','openrouter','cloudflare_workers_ai_token','cloudflare_account_id'];
BEGIN
  LOCK TABLE public.user_api_keys IN ACCESS EXCLUSIVE MODE;
  SELECT attnum INTO STRICT provider_number FROM pg_attribute
    WHERE attrelid='public.user_api_keys'::regclass AND attname='provider' AND NOT attisdropped;
  SELECT pg_get_expr(conbin,conrelid) INTO STRICT old_expression FROM pg_constraint
    WHERE conrelid='public.user_api_keys'::regclass AND conname='user_api_keys_provider_check'
      AND contype='c' AND conkey=ARRAY[provider_number];
  EXECUTE format('SELECT bool_and(%s) FROM unnest($1::text[]) AS candidate(provider)',old_expression)
    INTO already_allowed USING additions;
  IF already_allowed IS DISTINCT FROM true THEN
    ALTER TABLE public.user_api_keys DROP CONSTRAINT user_api_keys_provider_check;
    EXECUTE format('ALTER TABLE public.user_api_keys ADD CONSTRAINT user_api_keys_provider_check CHECK ((%s) OR provider = ANY (%L::text[])) NOT VALID',old_expression,additions::text);
    ALTER TABLE public.user_api_keys VALIDATE CONSTRAINT user_api_keys_provider_check;
  END IF;
END $g1$;

-- 중복 실행·다른 CLI 선행 등록 시 기존 카탈로그 행을 덮어쓰지 않는다.
INSERT INTO public.integration_catalog
  (key,kind,label,description,key_names,connect_program_url,sort_order,is_active)
VALUES
 ('groq','api_key','Groq','본인 Groq 키. 무료 한도는 본인 Limits 확인. AI Prompt의 API키등록·플랫폼연동에서 등록.',ARRAY['groq'],'https://ai-prompt.buylife.xyz',210,true),
 ('openrouter','api_key','OpenRouter','본인 키·고정 무료 모델 사용. 다른 유료 모델로 자동 전환하지 않음.',ARRAY['openrouter'],'https://ai-prompt.buylife.xyz',220,true),
 ('cloudflare_workers_ai','account_set','Cloudflare Workers AI','본인 계정 ID와 Workers AI 권한 토큰. Paid 계정의 무료 초과분은 공급자 요금 적용.',ARRAY['cloudflare_workers_ai_token','cloudflare_account_id'],'https://ai-prompt.buylife.xyz',230,true),
 ('nvidia_nim','api_key','NVIDIA NIM (운영 조건 확인 대기)','개발·연구 무료 이용과 실회원 운영 이용 조건이 달라 비활성. 운영 호출·키 등록 미개방.',ARRAY['nvidia'],NULL,240,false)
ON CONFLICT (key) DO NOTHING;
