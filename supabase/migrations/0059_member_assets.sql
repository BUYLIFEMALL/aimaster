-- 「내 자료함」 1단계 — 같은 회원 계정 안에서 프로그램 간 자료 재사용(음악 3종부터) (주인님 승인 2026-11-11)
-- 플랜: docs/PLAN_20261111_MEMBER_LIBRARY.md · 분석: docs/analysis-member-library-20261111/REPORT.md
-- 원칙: 파일은 옮기지 않는다(원본 버킷 그대로, 열 때 서버가 서명 주소). 원본 줄이 지워지면 자료함 줄도 지워
--       보관 기간이 각 프로그램 정리 규칙(30일 / 발행 1년 / 지정 프로그램 1년 / 관리자·시험 계정 무기한)을 자동으로 따른다.
-- 음악 프로그램 코드·배포는 바꾸지 않는다 — 원본 표에 트리거만 단다.
begin;

create table if not exists public.member_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_slug text not null,
  kind text not null check (kind in ('audio', 'image', 'video', 'text', 'file')),
  title text not null default '',
  bucket text,
  path text,
  url text,
  source_table text not null,
  source_id uuid not null,
  source_index int not null default 0,
  duration_s numeric,
  bytes bigint,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_table, source_id, source_index)
);
comment on table public.member_assets is '내 자료함 색인 — 회원 본인 생성물 목록(원본은 각 프로그램 표·버킷). 쓰기는 트리거·서버 키만';
create index if not exists member_assets_user_kind_idx on public.member_assets (user_id, kind, created_at desc);

alter table public.member_assets enable row level security;
drop policy if exists member_assets_select_own on public.member_assets;
create policy member_assets_select_own on public.member_assets for select to authenticated using (auth.uid() = user_id);
-- insert·update·delete 정책 없음 = 회원이 직접 쓰지 못함(트리거·서버 키 전용)
revoke insert, update, delete on public.member_assets from anon, authenticated;

-- ── 1) AI 음악 스튜디오: ams_generations.outputs 곡마다 한 줄 ─────────────────
create or replace function public.member_assets_sync_ams() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o jsonb; i int := 0;
begin
  if tg_op = 'DELETE' then
    delete from public.member_assets where source_table = 'ams_generations' and source_id = old.id;
    return old;
  end if;
  delete from public.member_assets where source_table = 'ams_generations' and source_id = new.id;
  if new.status = 'completed' and jsonb_typeof(new.outputs) = 'array' then
    for o in select * from jsonb_array_elements(new.outputs) loop
      if coalesce(o->>'path', '') like new.user_id::text || '/%' then
        insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, source_table, source_id, source_index, duration_s, bytes, meta, created_at)
        values (new.user_id, 'ai-music-studio', 'audio',
          left(coalesce(nullif(o->>'title', ''), nullif(new.title, ''), left(new.prompt, 40), 'AI 음악')
               || case when jsonb_array_length(new.outputs) > 1 then ' (' || (i + 1) || ')' else '' end, 120),
          'ai-music-studio', o->>'path', 'ams_generations', new.id, i,
          nullif(o->>'durationS', '')::numeric, nullif(o->>'bytes', '')::bigint,
          jsonb_build_object('model', new.model, 'instrumental', new.instrumental, 'style', left(coalesce(new.prompt, ''), 300)),
          new.created_at)
        on conflict (source_table, source_id, source_index) do nothing;
      end if;
      i := i + 1;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists member_assets_sync_ams on public.ams_generations;
create trigger member_assets_sync_ams after insert or update of status, outputs or delete on public.ams_generations
  for each row execute function public.member_assets_sync_ams();

-- ── 2) 음악(SUNO) 자동화: music_track_variants 버전마다 한 줄(제목은 music_tracks) ──
create or replace function public.member_assets_sync_suno() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t record; p text; prefix text := '/storage/v1/object/';
begin
  if tg_op = 'DELETE' then
    delete from public.member_assets where source_table = 'music_track_variants' and source_id = old.id;
    return old;
  end if;
  delete from public.member_assets where source_table = 'music_track_variants' and source_id = new.id;
  if coalesce(new.audio_url, '') = '' then return new; end if;
  select title, mode, style_description into t from public.music_tracks where id = new.track_id;
  -- 우리 저장소 주소면 music-audio 경로로(비공개 버킷이라 서명 주소로 연다), 아니면 외부(Suno 임시) 주소 그대로
  if position(prefix in new.audio_url) > 0 and position('/music-audio/' in new.audio_url) > 0 then
    p := split_part(split_part(new.audio_url, '/music-audio/', 2), '?', 1);
  end if;
  insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, url, source_table, source_id, source_index, duration_s, meta, created_at)
  values (new.user_id, 'music-automation', 'audio', left(coalesce(nullif(t.title, ''), '제목 없음'), 120),
    case when p is not null then 'music-audio' end, p, case when p is null then new.audio_url end,
    'music_track_variants', new.id, 0, new.duration_seconds,
    jsonb_build_object('mode', t.mode, 'style', left(coalesce(t.style_description, ''), 300), 'track_id', new.track_id, 'external', p is null),
    new.created_at)
  on conflict (source_table, source_id, source_index) do nothing;
  return new;
end $$;
drop trigger if exists member_assets_sync_suno on public.music_track_variants;
create trigger member_assets_sync_suno after insert or update of audio_url or delete on public.music_track_variants
  for each row execute function public.member_assets_sync_suno();

-- ── 3) AI 무료음악: free_music_tracks(음원은 회원 PC — 곡 정보만) ─────────────
create or replace function public.member_assets_sync_fms() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.member_assets where source_table = 'free_music_tracks' and source_id = old.id;
    return old;
  end if;
  delete from public.member_assets where source_table = 'free_music_tracks' and source_id = new.id;
  if new.trashed_at is null then
    insert into public.member_assets (user_id, source_slug, kind, title, source_table, source_id, source_index, duration_s, meta, created_at)
    values (new.user_id, 'free-music-studio', 'audio', left(coalesce(nullif(new.title, ''), '제목 없음'), 120),
      'free_music_tracks', new.id, 0, new.duration_sec,
      jsonb_build_object('style', left(coalesce(new.style_prompt, ''), 300), 'local_only', true, 'has_lyrics', coalesce(new.lyrics, '') <> ''),
      new.created_at)
    on conflict (source_table, source_id, source_index) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists member_assets_sync_fms on public.free_music_tracks;
create trigger member_assets_sync_fms after insert or update of trashed_at, title or delete on public.free_music_tracks
  for each row execute function public.member_assets_sync_fms();

revoke execute on function public.member_assets_sync_ams() from public, anon, authenticated;
revoke execute on function public.member_assets_sync_suno() from public, anon, authenticated;
revoke execute on function public.member_assets_sync_fms() from public, anon, authenticated;

-- ── 기존 자료 채우기(원본 표는 건드리지 않고 읽어서 넣는다 — 수정 시각이 바뀌지 않게) ──
insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, source_table, source_id, source_index, duration_s, bytes, meta, created_at)
select g.user_id, 'ai-music-studio', 'audio',
  left(coalesce(nullif(o.v->>'title', ''), nullif(g.title, ''), left(g.prompt, 40), 'AI 음악')
       || case when jsonb_array_length(g.outputs) > 1 then ' (' || o.n || ')' else '' end, 120),
  'ai-music-studio', o.v->>'path', 'ams_generations', g.id, (o.n - 1)::int,
  nullif(o.v->>'durationS', '')::numeric, nullif(o.v->>'bytes', '')::bigint,
  jsonb_build_object('model', g.model, 'instrumental', g.instrumental, 'style', left(coalesce(g.prompt, ''), 300)),
  g.created_at
from public.ams_generations g
cross join lateral jsonb_array_elements(g.outputs) with ordinality as o(v, n)
where g.status = 'completed' and jsonb_typeof(g.outputs) = 'array'
  and coalesce(o.v->>'path', '') like g.user_id::text || '/%'
on conflict (source_table, source_id, source_index) do nothing;

insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, url, source_table, source_id, source_index, duration_s, meta, created_at)
select v.user_id, 'music-automation', 'audio', left(coalesce(nullif(t.title, ''), '제목 없음'), 120),
  case when x.p is not null then 'music-audio' end, x.p, case when x.p is null then v.audio_url end,
  'music_track_variants', v.id, 0, v.duration_seconds,
  jsonb_build_object('mode', t.mode, 'style', left(coalesce(t.style_description, ''), 300), 'track_id', v.track_id, 'external', x.p is null),
  v.created_at
from public.music_track_variants v
left join public.music_tracks t on t.id = v.track_id
cross join lateral (select case when position('/storage/v1/object/' in v.audio_url) > 0 and position('/music-audio/' in v.audio_url) > 0
  then split_part(split_part(v.audio_url, '/music-audio/', 2), '?', 1) end as p) x
where coalesce(v.audio_url, '') <> ''
on conflict (source_table, source_id, source_index) do nothing;

insert into public.member_assets (user_id, source_slug, kind, title, source_table, source_id, source_index, duration_s, meta, created_at)
select f.user_id, 'free-music-studio', 'audio', left(coalesce(nullif(f.title, ''), '제목 없음'), 120),
  'free_music_tracks', f.id, 0, f.duration_sec,
  jsonb_build_object('style', left(coalesce(f.style_prompt, ''), 300), 'local_only', true, 'has_lyrics', coalesce(f.lyrics, '') <> ''),
  f.created_at
from public.free_music_tracks f
where f.trashed_at is null
on conflict (source_table, source_id, source_index) do nothing;

commit;

-- 확인: select source_slug, count(*) from public.member_assets group by 1;
--  기대: ai-music-studio = 완성 생성의 곡 수, music-automation = audio_url 있는 버전 수, free-music-studio = 휴지통 아닌 곡 수
