-- 1. programs 테이블에 네이버 블로그 에이전트 등록
INSERT INTO public.programs (
  slug,
  title,
  name,
  description,
  app_url,
  version,
  is_active,
  badges,
  sort_order,
  category,
  created_at,
  updated_at
) VALUES (
  'naver-blog-agent',
  '네이버 블로그 에이전트',
  '네이버 블로그 에이전트',
  '크롬 확장프로그램과 5단계 멀티 AI 에이전트로 봇 탐지 없이 네이버 블로그 글을 자동 기획·작성·윤문·발행하는 스마트 마케팅 솔루션',
  'https://naver-blog-agent.vercel.app',
  'v1.01',
  true,
  ARRAY[]::text[],
  40,
  'marketing',
  NOW(),
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  app_url = EXCLUDED.app_url,
  version = EXCLUDED.version,
  is_active = true,
  updated_at = NOW();

-- 2. pricing_plans 기본 3단계 등록
DO $$
DECLARE
  v_program_id UUID;
BEGIN
  SELECT id INTO v_program_id FROM public.programs WHERE slug = 'naver-blog-agent' LIMIT 1;
  IF v_program_id IS NOT NULL THEN
    INSERT INTO public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, created_at)
    VALUES
      (v_program_id, '1개월', 'monthly', 10000, 10000, true, NOW()),
      (v_program_id, '2개월', 'bimonthly', 20000, 20000, true, NOW()),
      (v_program_id, '3개월', 'quarterly', 30000, 30000, true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 3. 네이버 계정 테이블
CREATE TABLE IF NOT EXISTS public.nba_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blog_id TEXT NOT NULL,
  label TEXT NOT NULL,
  default_category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, blog_id)
);

ALTER TABLE public.nba_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nba_accounts_owner_manage"
  ON public.nba_accounts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. 카테고리 및 키워드 설정 테이블
CREATE TABLE IF NOT EXISTS public.nba_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.nba_accounts(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  search_keywords TEXT NOT NULL DEFAULT '',
  publish_purpose TEXT NOT NULL DEFAULT '',
  preferred_tone TEXT NOT NULL DEFAULT '해요체',
  freshness_level TEXT NOT NULL DEFAULT '보통',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.nba_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nba_categories_owner_manage"
  ON public.nba_categories
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. 글 원고 및 발행 큐 테이블
CREATE TABLE IF NOT EXISTS public.nba_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.nba_accounts(id) ON DELETE SET NULL,
  blog_id TEXT NOT NULL,
  category_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, queued, publishing, published, failed
  is_reserved BOOLEAN NOT NULL DEFAULT false,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  post_url TEXT,
  error_message TEXT,
  token_usage JSONB,
  research_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nba_posts_user_status ON public.nba_posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_nba_posts_scheduled ON public.nba_posts(status, scheduled_at);

ALTER TABLE public.nba_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nba_posts_owner_manage"
  ON public.nba_posts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. 크롬 확장 프로그램 페어링 토큰 테이블
CREATE TABLE IF NOT EXISTS public.nba_extension_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  pair_code TEXT UNIQUE,
  pair_code_expires_at TIMESTAMPTZ,
  device_name TEXT,
  last_ping_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.nba_extension_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nba_extension_tokens_owner_manage"
  ON public.nba_extension_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
