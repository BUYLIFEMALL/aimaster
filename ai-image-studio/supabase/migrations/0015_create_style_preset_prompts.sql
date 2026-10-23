-- Create style_preset_prompts table for AI Image Studio
CREATE TABLE IF NOT EXISTS public.style_preset_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id TEXT NOT NULL,
  label TEXT NOT NULL,
  prompt TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by style_id and display_order
CREATE INDEX IF NOT EXISTS idx_style_preset_prompts_style_id ON public.style_preset_prompts(style_id, display_order);

-- Enable RLS
ALTER TABLE public.style_preset_prompts ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read style_preset_prompts"
  ON public.style_preset_prompts FOR SELECT
  USING (true);

-- Writes are admin-only at the DB level; the app's API routes use the service role key.
CREATE POLICY "Admins manage style_preset_prompts"
  ON public.style_preset_prompts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin));
