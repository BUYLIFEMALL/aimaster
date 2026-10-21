-- 2026-10-21 음악 병합 M1 1단계 (v1.17): Suno 음악기획 자동화의 기획 기능을 음악(SUNO)자동화로 옮기면서
-- 브라우저(localStorage)에만 있던 기획 자료를 회원별 서버 표로 옮긴다. 주인님 승인: 새 표 2개.
-- 계획: music/docs/PLAN_20261021_MERGE_M1_SUNO_STUDIO.md

-- 1) 내 Style — 회원이 직접 저장한 Style 프리셋(설정성 자료라 자동 삭제하지 않는다).
create table if not exists public.music_studio_styles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  data jsonb not null default '{}'::jsonb,   -- style·exclude·태그 등(옛 앱 Style 항목 그대로)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists music_studio_styles_user_idx on public.music_studio_styles(user_id, updated_at desc);

-- 2) 곡·앨범 기획 — 생성 콘텐츠이므로 마지막 수정 30일 뒤 자동 삭제(최상위 규칙).
create table if not exists public.music_studio_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('song','album')),
  title text not null default '',
  data jsonb not null default '{}'::jsonb,   -- 옛 앱 Track/Album 구조 그대로
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists music_studio_projects_user_idx on public.music_studio_projects(user_id, updated_at desc);
create index if not exists music_studio_projects_updated_idx on public.music_studio_projects(updated_at);

create trigger music_studio_styles_set_updated_at before update on public.music_studio_styles
  for each row execute function public.set_updated_at();
create trigger music_studio_projects_set_updated_at before update on public.music_studio_projects
  for each row execute function public.set_updated_at();

alter table public.music_studio_styles enable row level security;
alter table public.music_studio_projects enable row level security;
revoke all on public.music_studio_styles, public.music_studio_projects from public, anon;
grant select, insert, update, delete on public.music_studio_styles, public.music_studio_projects to authenticated;
grant all on public.music_studio_styles, public.music_studio_projects to service_role;

create policy music_studio_styles_owner_all on public.music_studio_styles
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- 30일 지난 기획은 정리 작업 전이라도 바로 보이지 않게 한다.
create policy music_studio_projects_owner_all on public.music_studio_projects
  for all to authenticated
  using ((select auth.uid()) = user_id and updated_at > now() - interval '30 days')
  with check ((select auth.uid()) = user_id);

create or replace function public.cleanup_music_studio_projects() returns bigint
language plpgsql set search_path = '' as $$
declare n bigint;
begin
  delete from public.music_studio_projects where updated_at <= now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.cleanup_music_studio_projects() from public, anon, authenticated;

select cron.schedule('music-studio-projects-retention-30d', '17 * * * *',
  'select public.cleanup_music_studio_projects();');

-- 3) music-audio 저장소: 「모든 파일 조회」 정책을 회원 본인 폴더로 좁혀 공개 키로 다른 회원의 파일 목록을
-- 훑어보지 못하게 한다. 공개 버킷의 공개 주소(/object/public/...)는 조회 정책과 무관해서 재생·다운로드·
-- 기존 공유 링크는 그대로 열린다. 웹훅·관리자 화면은 service role이라 영향 없음(주인님 결정 2026-10-21).
drop policy if exists "music_audio_select_public" on storage.objects;
create policy "music_audio_select_own" on storage.objects for select
  using (bucket_id = 'music-audio' and auth.uid()::text = (storage.foldername(name))[1]);

-- 4) 버전
update public.programs set version = 'v1.17', updated_at = now() where slug = 'music-automation';
