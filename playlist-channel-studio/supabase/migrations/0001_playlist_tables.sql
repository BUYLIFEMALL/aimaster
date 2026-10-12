-- 플레이리스트 채널 제작 자동화(playlist-channel-studio) v1.01 — 회원별 프로젝트 테이블·비공개 썸네일 저장소 (2026-10-13)
--  - playlist_projects: 장르·제목 후보·선택 제목·콘텐츠(Suno 프롬프트/가사/메타데이터)·썸네일 경로와 설정을 한 프로젝트로 보관 (user_id + RLS owner-only)
--  - storage 버킷 playlist-thumbs: 비공개. 서버(service role)가 올리고 서명 URL로만 보여준다. 경로는 <user_id>/<project_id>/thumb.jpg
--  - 운영 비용 보호: 사용자당 프로젝트 30개 제한(서버 검사), 썸네일은 1280x720 JPEG로 줄여 저장
--  - API 키는 공용 user_api_keys(provider: gemini / openai / anthropic)의 회원 본인 키만 사용한다.
CREATE TABLE IF NOT EXISTS public.playlist_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  genre text NOT NULL DEFAULT '',
  title text,
  titles jsonb NOT NULL DEFAULT '[]'::jsonb,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','titled','content')),
  thumb_path text,
  thumb_settings jsonb,
  thumb_prompt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS playlist_projects_user_created ON public.playlist_projects (user_id, created_at DESC);
ALTER TABLE public.playlist_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS playlist_projects_owner ON public.playlist_projects;
CREATE POLICY playlist_projects_owner ON public.playlist_projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('playlist-thumbs', 'playlist-thumbs', false, 4194304, ARRAY['image/jpeg','image/webp','image/png'])
ON CONFLICT (id) DO NOTHING;
