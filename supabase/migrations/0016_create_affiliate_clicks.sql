-- affiliate_clicks existed only in supabase/schema.sql and was never created in production.
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code text NOT NULL,
  referrer_id uuid REFERENCES public.profiles(id),
  ip_address text,
  user_agent text,
  page_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_code ON public.affiliate_clicks(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_referrer ON public.affiliate_clicks(referrer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_date ON public.affiliate_clicks(created_at);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_clicks_select_own" ON public.affiliate_clicks;
CREATE POLICY "affiliate_clicks_select_own" ON public.affiliate_clicks
  FOR SELECT USING (auth.uid() = referrer_id);
