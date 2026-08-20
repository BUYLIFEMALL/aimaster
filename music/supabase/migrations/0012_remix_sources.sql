-- 리믹스를 "원본별 그룹"으로 보여주기 위한 상위 엔티티. 지금까지는 music_track_remixes가
-- source_title(순수 텍스트)만 갖고 있어서 같은 원곡에서 여러 번 리믹스를 만들어도 서로
-- 이어붙일 방법이 없었다(2026-08-20, 사용자가 "/remix 목록 → 클릭하면 그 원곡의 리믹스들"
-- 구조를 요청하며 발견). 원본은 두 종류다:
--   - track: 이미 생성한 곡(TrackCard의 "이 곡으로 리믹스" 버튼)에서 시작한 경우
--   - upload: 사용자가 오디오 파일을 새로 업로드해서 시작한 경우
create table public.music_remix_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('track', 'upload')),
  track_id uuid references public.music_tracks(id) on delete set null,
  title text not null,
  audio_url text not null,
  created_at timestamptz not null default now()
);

create index music_remix_sources_user_id_idx on public.music_remix_sources(user_id);
-- 같은 트랙에서 "이 곡으로 리믹스"를 여러 번 눌러도 소스 그룹은 하나만 생기도록(추가 리믹스는
-- 기존 소스 재사용) track 기준 사용자당 유일해야 한다.
create unique index music_remix_sources_user_track_idx on public.music_remix_sources(user_id, track_id) where kind = 'track';

alter table public.music_remix_sources enable row level security;
create policy "music_remix_sources_owner_select" on public.music_remix_sources for select using (auth.uid() = user_id);
create policy "music_remix_sources_owner_insert" on public.music_remix_sources for insert with check (auth.uid() = user_id);
create policy "music_remix_sources_owner_delete" on public.music_remix_sources for delete using (auth.uid() = user_id);

alter table public.music_track_remixes add column source_id uuid references public.music_remix_sources(id) on delete cascade;
create index music_track_remixes_source_id_idx on public.music_track_remixes(source_id);

-- 기존(마이그레이션 이전) 리믹스 백필: track_id 연결 정보가 원래 저장되지 않았으므로 전부
-- kind='upload'로 합성하고, (user_id, 제목, 오디오URL)이 같은 것끼리 같은 소스로 묶는다.
-- 이후 새로 만드는 리믹스부터는 정확한 kind(track/upload)로 분류된다.
insert into public.music_remix_sources (user_id, kind, title, audio_url, created_at)
select user_id,
       'upload',
       coalesce(source_title, '제목 없음') as title,
       source_audio_url,
       min(created_at) as created_at
from public.music_track_remixes
group by user_id, coalesce(source_title, '제목 없음'), source_audio_url;

update public.music_track_remixes r
set source_id = s.id
from public.music_remix_sources s
where s.user_id = r.user_id
  and s.title = coalesce(r.source_title, '제목 없음')
  and s.audio_url = r.source_audio_url
  and r.source_id is null;
