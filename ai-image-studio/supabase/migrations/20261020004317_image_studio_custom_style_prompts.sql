-- Personal copies of administrator-provided examples. Shared originals remain unchanged.
CREATE TABLE public.ais_user_style_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_prompt_id uuid REFERENCES public.style_preset_prompts(id) ON DELETE SET NULL,
  style_id text NOT NULL CHECK (style_id IN (
    'photorealistic','pixar_3d','ghibli_anime','japanese_anime','3d_digital',
    'artistic_editorial','vector_illustration','cyberpunk_neon','oriental_ink',
    'watercolor_pastel','cinematic_film','claymation','webtoon_lineart',
    'architectural','dark_fantasy','minimal_flat'
  )),
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 120),
  prompt text NOT NULL CHECK (char_length(btrim(prompt)) BETWEEN 1 AND 20000),
  display_order integer NOT NULL DEFAULT 0 CHECK (display_order BETWEEN 0 AND 9999),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX ais_user_style_prompts_owner_style_idx
  ON public.ais_user_style_prompts(user_id, style_id, display_order);
CREATE INDEX ais_user_style_prompts_expiry_idx ON public.ais_user_style_prompts(expires_at);
CREATE INDEX ais_user_style_prompts_source_idx ON public.ais_user_style_prompts(source_prompt_id);

-- The client cannot reassign ownership or extend the 30-day lifetime by editing a row.
CREATE FUNCTION public.ais_stamp_user_style_prompt()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := clock_timestamp();
    NEW.expires_at := NEW.created_at + interval '30 days';
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
      RAISE EXCEPTION 'Prompt identity, owner and retention dates cannot be changed' USING ERRCODE = '42501';
    END IF;
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ais_stamp_user_style_prompt() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER ais_stamp_user_style_prompt BEFORE INSERT OR UPDATE
  ON public.ais_user_style_prompts FOR EACH ROW EXECUTE FUNCTION public.ais_stamp_user_style_prompt();

ALTER TABLE public.ais_user_style_prompts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ais_user_style_prompts FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ais_user_style_prompts TO authenticated;
GRANT ALL ON public.ais_user_style_prompts TO service_role;

CREATE POLICY ais_user_style_prompts_read_own ON public.ais_user_style_prompts
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND expires_at > now());
CREATE POLICY ais_user_style_prompts_insert_own ON public.ais_user_style_prompts
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND expires_at > now());
CREATE POLICY ais_user_style_prompts_update_own ON public.ais_user_style_prompts
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND expires_at > now())
  WITH CHECK (user_id = (SELECT auth.uid()) AND expires_at > now());
CREATE POLICY ais_user_style_prompts_delete_own ON public.ais_user_style_prompts
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE FUNCTION public.cleanup_ais_expired_custom_prompts()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE removed integer;
BEGIN
  DELETE FROM public.ais_user_style_prompts WHERE expires_at <= now();
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_ais_expired_custom_prompts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_ais_expired_custom_prompts() TO service_role;

-- pg_cron is already enabled in AIMaster. No extension or other job is changed here.
SELECT cron.schedule('ais-custom-prompts-retention-30d', '* * * * *',
  'select public.cleanup_ais_expired_custom_prompts();');

NOTIFY pgrst, 'reload schema';
