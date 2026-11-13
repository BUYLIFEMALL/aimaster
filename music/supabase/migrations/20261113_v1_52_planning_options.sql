-- 2026-11-13 v1.52: 새 기획 세부 설정(장르·무드·악기·보컬톤·템포 칩, 후렴 구절·단어·피할 말, 곡 길이) 저장(주인님 지시).
-- 스타일·제목·가사 AI와 생성 콘솔 칩 미리 채우기에 쓴다(lib/planOptions.ts). 기존 행 영향 없음(null). RLS는 기존 회원별 정책 그대로.
alter table public.music_plannings add column if not exists plan_options jsonb;

update public.programs set version = 'v1.52', updated_at = now() where slug = 'music-automation';
