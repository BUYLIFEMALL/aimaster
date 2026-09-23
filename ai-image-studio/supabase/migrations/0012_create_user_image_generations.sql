-- Create user_image_generations table for ai-image-studio
CREATE TABLE IF NOT EXISTS public.user_image_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt TEXT NOT NULL,
    enhanced_prompt TEXT,
    options JSONB DEFAULT '{}'::jsonb,
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_image_generations ENABLE ROW LEVEL SECURITY;

-- Owner-only RLS policies
CREATE POLICY "Users can view own image generations"
    ON public.user_image_generations
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own image generations"
    ON public.user_image_generations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own image generations"
    ON public.user_image_generations
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for fast query by user_id and created_at
CREATE INDEX IF NOT EXISTS idx_user_image_generations_user_created 
    ON public.user_image_generations(user_id, created_at DESC);
