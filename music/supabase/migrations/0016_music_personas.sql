-- 2026-10-21 Suno V6 2차 ③: 페르소나(sunoapi.org /generate/generate-persona). 주인님 승인: 새 표 music_personas.
-- 곡의 목소리·스타일을 Suno 페르소나 ID로 저장해 다음 생성(personaId, personaModel=style_persona)에 쓴다.
-- 「내 Style」처럼 회원 설정 성격이라 30일 자동 삭제 대상에서 제외(원곡이 지워져도 Suno 페르소나 ID는 그대로 쓸 수 있음).
create table if not exists public.music_personas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  suno_persona_id text not null,
  name text not null check (length(name) between 1 and 80),
  description text not null default '',
  style text,
  source_variant_id uuid references public.music_track_variants(id) on delete set null,
  source_title text,
  created_at timestamptz not null default now()
);
create index if not exists music_personas_user_idx on public.music_personas(user_id, created_at desc);
alter table public.music_personas enable row level security;
revoke all on public.music_personas from public, anon;
grant select, insert, update, delete on public.music_personas to authenticated;
grant all on public.music_personas to service_role;
create policy music_personas_owner_all on public.music_personas
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
update public.programs set version = 'v1.27', updated_at = now() where slug = 'music-automation';
select count(*) as personas_table_ready from public.music_personas;
