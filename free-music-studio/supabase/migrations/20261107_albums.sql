-- AI 무료음악 자동화 v1.35 — 앨범(그림 보관함) (2026-11-07, 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth, 채팅 승인 「진행해」).
-- 주인님 「음악 앨범 매뉴를 좌측에 만들고」「앨범만 만들고 곡은 안만들수 있는 상황이니 별도의 기능」. 플랜 docs/PLAN_20261107_ALBUMS.md
--  - 이름·그림 설명만 저장한다. 그림 파일은 회원 PC 노래 저장 폴더 안 Albums/<id>.png(엔진 0.7.3) — 서버에 그림을 두지 않는다.
--  - 회원별 소유(user_id + owner-only RLS). 생성 데이터라 30일 자동 정리 대상(관리자·시험 계정 제외, /api/cron/cleanup).
--    기록이 지워져도 PC의 그림은 남고 앨범 화면에 「이름 없는 앨범」으로 보인다.
-- 표 추가만(기존 자료 변경 없음).

CREATE TABLE IF NOT EXISTS public.free_music_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 60),
  art_prompt text NOT NULL DEFAULT '' CHECK (char_length(art_prompt) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS free_music_albums_user_idx ON public.free_music_albums (user_id, created_at DESC);

ALTER TABLE public.free_music_albums ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS free_music_albums_owner ON public.free_music_albums;
CREATE POLICY free_music_albums_owner ON public.free_music_albums
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
