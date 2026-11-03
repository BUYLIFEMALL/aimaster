-- AI 무료음악 자동화(free-music-studio) v1.01 — 곡 표 + 프로그램 등록 (2026-11-03, 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth)
-- 플랜: free-music-studio/docs/PLAN_20261103_V1_01.md §4 1단계. 실행은 주인님 승인 뒤(DB 스키마 변경).
--  - 곡 표: 회원별 소유(user_id + owner-only RLS). 음원 파일은 회원 PC에만 두고 여기에는 글 정보만 저장.
--  - 30일 자동 삭제는 /api/cron/cleanup(관리자·시험 계정 profiles.retention_exempt 제외).
--  - 등록: 카테고리·최소 등급은 음악(SUNO) 프로그램 music-automation 값을 그대로 쓴다. 엔진 공개 전이라 「coming」 배지.

CREATE TABLE IF NOT EXISTS public.free_music_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  style_prompt text NOT NULL DEFAULT '' CHECK (char_length(style_prompt) <= 400),
  lyrics text NOT NULL DEFAULT '' CHECK (char_length(lyrics) <= 4000),
  duration_sec integer NOT NULL DEFAULT 120 CHECK (duration_sec IN (30, 60, 120, 180, 240)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS free_music_songs_user_updated_idx ON public.free_music_songs (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS free_music_songs_created_idx ON public.free_music_songs (created_at);

ALTER TABLE public.free_music_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS free_music_songs_owner ON public.free_music_songs;
CREATE POLICY free_music_songs_owner ON public.free_music_songs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
SELECT
  'free-music-studio',
  'AI 무료음악 자동화',
  '가사와 스타일만 정리하면 내 PC에서 키·요금 없이 노래를 만드는 AI 무료음악 자동화',
  '<p><strong>가사만 준비하면, 노래는 회원님 PC가 키와 요금 없이 만듭니다.</strong></p><p>🎵 곡 제목·길이·스타일·가사를 정리해 저장하고, 주제만 적으면 AI 작사로 가사를 채울 수 있습니다.</p><p>🖥️ 내 PC 엔진(준비 중)이 공개 음악 모델로 노래를 만들며, 음원 파일은 회원님 PC에만 저장됩니다.</p><p>🔑 AI 작사는 회원님 본인의 Claude API 키로 동작하며, 음악 생성 자체에는 키가 필요 없습니다.</p>',
  'https://free-music-studio.buylife.xyz',
  'v1.01',
  true,
  ARRAY['new','coming']::text[],
  m.category_id,
  m.required_grade_id
FROM public.programs m
WHERE m.slug = 'music-automation'
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, short_desc = EXCLUDED.short_desc, description = EXCLUDED.description,
  app_url = EXCLUDED.app_url, version = EXCLUDED.version, is_active = EXCLUDED.is_active,
  badges = EXCLUDED.badges, category_id = EXCLUDED.category_id, required_grade_id = EXCLUDED.required_grade_id,
  updated_at = NOW();

INSERT INTO public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
SELECT p.id, v.name, v.bt, v.price, v.price, true, v.so
FROM public.programs p
CROSS JOIN (VALUES ('1개월','monthly',10000,1), ('2개월','bimonthly',20000,2), ('3개월','quarterly',30000,3)) AS v(name, bt, price, so)
WHERE p.slug = 'free-music-studio'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);
