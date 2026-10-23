-- threads_categories 테이블 생성
CREATE TABLE IF NOT EXISTS public.threads_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- threads_candidates 테이블에 category_id 추가
ALTER TABLE public.threads_candidates
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.threads_categories(id) ON DELETE SET NULL;

-- RLS 설정
ALTER TABLE public.threads_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'threads_categories' AND policyname = 'Users can manage their own threads categories'
  ) THEN
    CREATE POLICY "Users can manage their own threads categories"
    ON public.threads_categories
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
