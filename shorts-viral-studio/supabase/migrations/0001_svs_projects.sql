-- shorts-viral-studio 프로젝트 저장 테이블 (svs_projects)
-- 멀티테넌시 원칙: user_id + RLS owner-only (to authenticated). "service role용" 정책은 만들지 않는다(service role은 RLS를 우회한다).
-- YouTube API 데이터 30일 보관 정책: 만든 지 30일이 지난 행은 목록 조회 시 코드에서 삭제한다(lib/actions/projects.ts).

CREATE TABLE IF NOT EXISTS svs_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '제목 없는 프로젝트',
  keyword TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE svs_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "svs_projects_select_own"
  ON svs_projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "svs_projects_insert_own"
  ON svs_projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "svs_projects_update_own"
  ON svs_projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "svs_projects_delete_own"
  ON svs_projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_svs_projects_user_updated
  ON svs_projects (user_id, updated_at DESC);
