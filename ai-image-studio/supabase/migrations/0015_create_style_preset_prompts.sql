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

-- Allow authenticated users to insert/update/delete (or admin service role)
CREATE POLICY "Allow authenticated insert style_preset_prompts"
  ON public.style_preset_prompts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update style_preset_prompts"
  ON public.style_preset_prompts FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete style_preset_prompts"
  ON public.style_preset_prompts FOR DELETE
  USING (auth.role() = 'authenticated');
