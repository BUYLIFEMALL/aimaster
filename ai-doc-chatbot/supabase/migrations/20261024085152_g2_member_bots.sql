-- G-2: AIMaster 운영 esgxyikcnnvmlhygjkth 전용. 직접 저장하는 회원 봇 설정.
-- CLI migration new로 생성 후 실제 운영 마이그레이션 이력 20261024085152에 파일명을 맞춤.
-- 기존 회원 키·대화·문서·임베딩·30일 정리 작업은 변경하지 않는다.
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';
CREATE TABLE public.dcb_bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  instructions text NOT NULL CHECK (char_length(btrim(instructions)) BETWEEN 1 AND 6000),
  provider text NOT NULL CHECK (provider IN ('upstage','groq','openrouter','cloudflare')),
  model text NOT NULL CHECK (char_length(model) BETWEEN 1 AND 200),
  temperature double precision NOT NULL DEFAULT 0.3 CHECK (temperature BETWEEN 0 AND 1),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dcb_bots_user_idx ON public.dcb_bots(user_id,created_at);
ALTER TABLE public.dcb_bots ENABLE ROW LEVEL SECURITY;
-- 일반 회원은 본인 설정 조회만. 쓰기는 프로그램 이용권을 확인하는 서버 API에서만 수행.
REVOKE ALL ON TABLE public.dcb_bots FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.dcb_bots TO authenticated;
GRANT ALL ON TABLE public.dcb_bots TO service_role;
CREATE POLICY dcb_bots_select_own ON public.dcb_bots FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 정적 기본 봇 또는 본인 봇 UUID. 서버에서 매번 소유권/모델/삭제 상태를 검증한다.
-- 삭제 후 참조를 남겨 사용자에게 해제/다른 봇 선택을 요구하며 자동 대체하지 않는다.
ALTER TABLE public.dcb_rooms ADD COLUMN bot_ref text
  CHECK (bot_ref IS NULL OR bot_ref IN ('preset-translate','preset-summary','preset-work')
    OR bot_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
-- 당시 설정을 복사해 회원별 과거 기록을 보존. 기존 메시지는 null, 보관 기간은 기존 메시지와 같다.
ALTER TABLE public.dcb_messages ADD COLUMN generation_context jsonb
  CHECK (generation_context IS NULL OR jsonb_typeof(generation_context) = 'object');
