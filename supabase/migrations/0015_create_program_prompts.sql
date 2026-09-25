-- Create program_prompts table for centralized prompt management across all programs
CREATE TABLE IF NOT EXISTS public.program_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_slug TEXT NOT NULL, -- e.g. 'ai-image-studio', 'ai-auto-blog', 'auto-threads-posting', 'music-automation', 'all'
    category TEXT NOT NULL DEFAULT 'general', -- e.g. '화풍선택', '블로그주제', 'SNS스타일', '음악장르'
    title TEXT NOT NULL, -- 프롬프트 제목 / 명칭
    prompt_text TEXT NOT NULL, -- 실제 AI 전달 프롬프트 내용
    description TEXT DEFAULT '', -- 설명 및 팁
    tags TEXT[] DEFAULT '{}', -- 검색용 태그 목록
    is_active BOOLEAN NOT NULL DEFAULT true, -- 활성화 여부
    sort_order INT NOT NULL DEFAULT 0, -- 정렬 순서
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by program_slug and category
CREATE INDEX IF NOT EXISTS idx_program_prompts_slug ON public.program_prompts(program_slug);
CREATE INDEX IF NOT EXISTS idx_program_prompts_category ON public.program_prompts(category);
CREATE INDEX IF NOT EXISTS idx_program_prompts_active ON public.program_prompts(is_active);

-- Enable RLS
ALTER TABLE public.program_prompts ENABLE ROW LEVEL SECURITY;

-- Allow public read access for active prompts
CREATE POLICY "Allow public read access for active prompts"
    ON public.program_prompts
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert/update/delete (Admin managed)
CREATE POLICY "Allow authenticated full access to program_prompts"
    ON public.program_prompts
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
