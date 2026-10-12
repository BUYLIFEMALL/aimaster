-- 시네마틱 스토리보드 자동화(cinematic-storyboard-studio) v1.01 — 회원별 프로젝트 테이블·비공개 이미지 저장소 (2026-10-13)
--  - storyboard_projects: 참조 이미지·분석·마스터 이미지 경로·영상 프롬프트를 한 프로젝트로 보관(user_id + RLS owner-only)
--  - storage 버킷 storyboard-ai: 비공개. 서버(service role)가 올리고 서명 URL로만 보여준다. 경로는 <user_id>/<project_id>/ref.jpg|master.jpg
--  - 운영 비용 보호: 사용자당 프로젝트 30개 제한(서버 검사), 이미지는 JPEG로 줄여 저장
CREATE TABLE IF NOT EXISTS public.storyboard_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  topic text NOT NULL DEFAULT '',
  lang text NOT NULL DEFAULT 'ko',
  engine text NOT NULL DEFAULT 'standard',
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','analyzed','rendered','prompts')),
  ref_path text,
  master_path text,
  analysis jsonb,
  video_prompts jsonb,
  video_settings jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS storyboard_projects_user_created ON public.storyboard_projects (user_id, created_at DESC);
ALTER TABLE public.storyboard_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS storyboard_projects_owner ON public.storyboard_projects;
CREATE POLICY storyboard_projects_owner ON public.storyboard_projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('storyboard-ai', 'storyboard-ai', false, 8388608, ARRAY['image/jpeg','image/webp','image/png'])
ON CONFLICT (id) DO NOTHING;
