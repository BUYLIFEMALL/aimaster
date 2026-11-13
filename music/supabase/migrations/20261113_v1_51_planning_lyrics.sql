-- 2026-11-13 v1.51: 빠른 기획 상세에서 가사를 미리 만들고 고쳐 저장(주인님 지시).
-- 값이 있으면 보컬판 생성 때 GPT 작사 대신 이 가사를 그대로 Suno로 보낸다. 비어 있으면 예전처럼 자동 작사.
-- 기존 행 영향 없음(새 칸은 null). RLS는 music_plannings 기존 회원별 정책 그대로.
alter table public.music_plannings add column if not exists lyrics text;

update public.programs set version = 'v1.51', updated_at = now() where slug = 'music-automation';
