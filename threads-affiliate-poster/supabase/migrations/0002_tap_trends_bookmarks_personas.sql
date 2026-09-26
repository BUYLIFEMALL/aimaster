-- threads-affiliate-poster 트렌드 보관함(tap_saved_posts) 및 사용자 AI 페르소나(tap_personas) 테이블 생성

-- 1. 찜한 트렌드 보관함 (tap_saved_posts)
CREATE TABLE IF NOT EXISTS tap_saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id VARCHAR(100) NOT NULL,
  author_handle VARCHAR(100) NOT NULL,
  author_name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  likes INT DEFAULT 0,
  replies INT DEFAULT 0,
  reposts INT DEFAULT 0,
  category VARCHAR(50) DEFAULT '일반',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- RLS 설정
ALTER TABLE tap_saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved posts"
  ON tap_saved_posts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. 나만의 AI 페르소나 (tap_personas)
CREATE TABLE IF NOT EXISTS tap_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  tone_description TEXT NOT NULL,
  sample_writing TEXT,
  emoji_style VARCHAR(50) DEFAULT 'moderate',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 설정
ALTER TABLE tap_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own personas"
  ON tap_personas
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
