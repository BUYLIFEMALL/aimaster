-- shorts-viral-studio 프롬프트 보관함 (svs_saved_prompts) — v1.03
-- 최종 생성된 이미지·영상·BGM 프롬프트 세트를 회원이 직접 저장해 모아 보는 용도.
-- 유튜브에서 가져온 데이터(영상 제목·조회수 등)는 담지 않고 AI가 만든 프롬프트만 저장하므로
-- 프로젝트(svs_projects)와 달리 30일 자동 삭제 대상이 아니다(회원이 직접 삭제할 때까지 보관).
-- 멀티테넌시 원칙: user_id + RLS owner-only (to authenticated). "service role용" 정책은 만들지 않는다.

CREATE TABLE IF NOT EXISTS svs_saved_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '제목 없는 프롬프트',
  idea_title TEXT NOT NULL DEFAULT '',
  hook TEXT NOT NULL DEFAULT '',
  keyword TEXT NOT NULL DEFAULT '',
  bgm_prompt JSONB,
  prompts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE svs_saved_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "svs_saved_prompts_select_own" ON svs_saved_prompts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "svs_saved_prompts_insert_own" ON svs_saved_prompts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "svs_saved_prompts_delete_own" ON svs_saved_prompts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_svs_saved_prompts_user_created ON svs_saved_prompts (user_id, created_at DESC);
