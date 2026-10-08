-- v1.49: 회원별 DB 이관에 필요한 핵심 테이블. 0001이 프로덕션에 적용되지 않아 누락돼 있던 테이블을 만든다.
-- 모든 테이블은 user_id + RLS owner-only. 서버 API는 service role로 접근하되 반드시 user_id로 거른다.
-- (0001의 programs 등록/요금제 부분은 이미 반영돼 있어 여기서 반복하지 않는다. nba_categories(계정별 프리셋)는
--  쓰이지 않아 만들지 않고, 콘텐츠 분류는 아래 nba_content_categories로 저장한다.)

-- 1. 네이버 블로그 계정
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

-- 2. 콘텐츠 분류(회원이 직접 만드는 글 분류. 네이버 블로그 메뉴가 아님). id는 화면이 만든 문자열 id를 그대로 보존한다.
CREATE TABLE IF NOT EXISTS public.nba_content_categories (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

-- 3. 글 원고 및 발행 큐
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

-- 4. 크롬 확장 페어링 토큰
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

-- RLS: 본인 행만
ALTER TABLE public.nba_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nba_content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nba_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nba_extension_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nba_accounts_owner_manage" ON public.nba_accounts;
CREATE POLICY "nba_accounts_owner_manage" ON public.nba_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "nba_content_categories_owner_manage" ON public.nba_content_categories;
CREATE POLICY "nba_content_categories_owner_manage" ON public.nba_content_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "nba_posts_owner_manage" ON public.nba_posts;
CREATE POLICY "nba_posts_owner_manage" ON public.nba_posts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "nba_extension_tokens_owner_manage" ON public.nba_extension_tokens;
CREATE POLICY "nba_extension_tokens_owner_manage" ON public.nba_extension_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
