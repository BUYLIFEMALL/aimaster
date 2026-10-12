-- 페르소나 문체 자동화(persona-style-studio) v1.01 — 회원별 페르소나·초안 저장 테이블 (2026-10-13)
--  - persona_style_personas: 기본 페르소나를 수정한 값(persona_key = 기본 id)과 회원이 만든 페르소나(persona_key = custom-…)
--  - persona_style_drafts: 저장한 초안(글·슬라이더·페르소나)
--  - 모두 user_id + RLS owner-only. 서버(service role)에서 쓸 때도 항상 user_id로 필터한다.
CREATE TABLE IF NOT EXISTS public.persona_style_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_key text NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  description text NOT NULL DEFAULT '',
  avatar text NOT NULL DEFAULT '👤',
  lore text NOT NULL DEFAULT '',
  voice text NOT NULL DEFAULT '',
  style text NOT NULL DEFAULT '',
  eq_values jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, persona_key)
);
CREATE TABLE IF NOT EXISTS public.persona_style_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL,
  eq_values jsonb,
  persona_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS persona_style_drafts_user_created ON public.persona_style_drafts (user_id, created_at DESC);

ALTER TABLE public.persona_style_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persona_style_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS persona_style_personas_owner ON public.persona_style_personas;
CREATE POLICY persona_style_personas_owner ON public.persona_style_personas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS persona_style_drafts_owner ON public.persona_style_drafts;
CREATE POLICY persona_style_drafts_owner ON public.persona_style_drafts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
