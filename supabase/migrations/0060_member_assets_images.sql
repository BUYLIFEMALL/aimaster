-- 「내 자료함」 2단계 — 이미지 스튜디오 4개 연결 (주인님 지시 2026-11-11 「2단계 이미지 스튜디오도 연결 진행해」)
-- 플랜: docs/PLAN_20261111_MEMBER_LIBRARY.md §8 · 1단계: 0059_member_assets.sql (같은 방식)
-- 원본 줄이 생기면 member_assets에 넣고, 원본 줄이 지워지면 함께 지운다(보관 기간 = 원본 규칙). 프로그램 코드·배포 변경 없음.
--  · ai-image-studio : 공용 usage_logs(action='image_generation', 이 프로그램 줄만) metadata.image_path 또는 옛 공개 주소(image_url)에서 경로
--  · banana-canvas   : banana_canvas_results.outputs[].path   (버킷 banana-canvas-files)
--  · portrait-photo  : portrait_photo_saved.path              (버킷 portrait-photo-files)
--  · thumbnail-master: thumbnail_master_projects.images_a/b.versions[].path (버킷 thumbnail-master-images, A안 0~ · B안 100~)
begin;

-- ── 1) AI 이미지 스튜디오(usage_logs, 조건부 트리거) ─────────────────────────
create or replace function public.member_assets_sync_ais() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p text; u text;
begin
  if tg_op = 'DELETE' then
    delete from public.member_assets where source_table = 'usage_logs' and source_id = old.id;
    return old;
  end if;
  delete from public.member_assets where source_table = 'usage_logs' and source_id = new.id;
  p := nullif(new.metadata->>'image_path', '');
  if p is null then
    u := coalesce(new.metadata->>'image_url', '');
    if position('/ai-image-generations/' in u) > 0 then p := split_part(split_part(u, '/ai-image-generations/', 2), '?', 1); end if;
  end if;
  if p is not null and p like new.user_id::text || '/%' then
    insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, source_table, source_id, source_index, meta, created_at)
    values (new.user_id, 'ai-image-studio', 'image', left(coalesce(nullif(new.metadata->>'prompt', ''), 'AI 이미지'), 120),
      'ai-image-generations', p, 'usage_logs', new.id, 0,
      jsonb_build_object('model', new.metadata->>'model', 'style', left(coalesce(new.metadata->>'prompt', ''), 300)),
      new.created_at)
    on conflict (source_table, source_id, source_index) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists member_assets_sync_ais on public.usage_logs;
create trigger member_assets_sync_ais after insert or update of metadata on public.usage_logs
  for each row when (new.action = 'image_generation' and new.program_id = '26b9f0b2-b48b-4f9d-b751-ecb88e98e95e'::uuid)
  execute function public.member_assets_sync_ais();
drop trigger if exists member_assets_sync_ais_del on public.usage_logs;
create trigger member_assets_sync_ais_del after delete on public.usage_logs
  for each row when (old.action = 'image_generation' and old.program_id = '26b9f0b2-b48b-4f9d-b751-ecb88e98e95e'::uuid)
  execute function public.member_assets_sync_ais();

-- ── 2) 바나나 캔버스 ─────────────────────────────────────────────────────────
create or replace function public.member_assets_sync_banana() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o jsonb; i int := 0;
begin
  if tg_op = 'DELETE' then
    delete from public.member_assets where source_table = 'banana_canvas_results' and source_id = old.id;
    return old;
  end if;
  delete from public.member_assets where source_table = 'banana_canvas_results' and source_id = new.id;
  if jsonb_typeof(new.outputs) = 'array' then
    for o in select * from jsonb_array_elements(new.outputs) loop
      if coalesce(o->>'path', '') like new.user_id::text || '/%' then
        insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, source_table, source_id, source_index, meta, created_at)
        values (new.user_id, 'banana-canvas', 'image',
          left(coalesce(nullif(new.title, ''), nullif(new.prompt, ''), '바나나 캔버스 결과')
               || case when jsonb_array_length(new.outputs) > 1 then ' (' || (i + 1) || ')' else '' end, 120),
          'banana-canvas-files', o->>'path', 'banana_canvas_results', new.id, i,
          jsonb_build_object('model', new.model_used, 'w', o->'w', 'h', o->'h', 'style', left(coalesce(new.prompt, ''), 300)),
          new.created_at)
        on conflict (source_table, source_id, source_index) do nothing;
      end if;
      i := i + 1;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists member_assets_sync_banana on public.banana_canvas_results;
create trigger member_assets_sync_banana after insert or update of outputs, title or delete on public.banana_canvas_results
  for each row execute function public.member_assets_sync_banana();

-- ── 3) 인물사진 ─────────────────────────────────────────────────────────────
create or replace function public.member_assets_sync_portrait() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.member_assets where source_table = 'portrait_photo_saved' and source_id = old.id;
    return old;
  end if;
  delete from public.member_assets where source_table = 'portrait_photo_saved' and source_id = new.id;
  if coalesce(new.path, '') like new.user_id::text || '/%' then
    insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, source_table, source_id, source_index, bytes, meta, created_at)
    values (new.user_id, 'portrait-photo', 'image', left(coalesce(nullif(new.purpose_label, ''), '인물 사진'), 120),
      'portrait-photo-files', new.path, 'portrait_photo_saved', new.id, 0, nullif(new.bytes, 0),
      jsonb_build_object('model', new.model, 'aspect', new.aspect), new.created_at)
    on conflict (source_table, source_id, source_index) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists member_assets_sync_portrait on public.portrait_photo_saved;
create trigger member_assets_sync_portrait after insert or update of path, purpose_label or delete on public.portrait_photo_saved
  for each row execute function public.member_assets_sync_portrait();

-- ── 4) 썸네일 마스터(A안·B안 버전마다 한 줄) ───────────────────────────────────
create or replace function public.member_assets_sync_thumb() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s record; v jsonb; i int;
begin
  if tg_op = 'DELETE' then
    delete from public.member_assets where source_table = 'thumbnail_master_projects' and source_id = old.id;
    return old;
  end if;
  delete from public.member_assets where source_table = 'thumbnail_master_projects' and source_id = new.id;
  for s in select * from (values ('A', 0, new.images_a), ('B', 100, new.images_b)) as t(label, base, imgs) loop
    i := 0;
    if jsonb_typeof(s.imgs->'versions') = 'array' then
      for v in select * from jsonb_array_elements(s.imgs->'versions') loop
        if coalesce(v->>'path', '') like new.user_id::text || '/%' then
          insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, source_table, source_id, source_index, meta, created_at)
          values (new.user_id, 'thumbnail-master', 'image',
            left(coalesce(nullif(new.name, ''), '썸네일') || ' · ' || s.label || '안 v' || coalesce(v->>'v', (i + 1)::text), 120),
            'thumbnail-master-images', v->>'path', 'thumbnail_master_projects', new.id, s.base + i,
            jsonb_build_object('model', v->>'model', 'style', left(coalesce(v->>'main', ''), 300)),
            new.created_at)
          on conflict (source_table, source_id, source_index) do nothing;
        end if;
        i := i + 1;
      end loop;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists member_assets_sync_thumb on public.thumbnail_master_projects;
create trigger member_assets_sync_thumb after insert or update of images_a, images_b, name or delete on public.thumbnail_master_projects
  for each row execute function public.member_assets_sync_thumb();

revoke execute on function public.member_assets_sync_ais() from public, anon, authenticated;
revoke execute on function public.member_assets_sync_banana() from public, anon, authenticated;
revoke execute on function public.member_assets_sync_portrait() from public, anon, authenticated;
revoke execute on function public.member_assets_sync_thumb() from public, anon, authenticated;

-- ── 기존 자료 채우기(원본은 건드리지 않고 읽어서 넣는다) ─────────────────────────
insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, source_table, source_id, source_index, meta, created_at)
select l.user_id, 'ai-image-studio', 'image', left(coalesce(nullif(l.metadata->>'prompt', ''), 'AI 이미지'), 120),
  'ai-image-generations', x.p, 'usage_logs', l.id, 0,
  jsonb_build_object('model', l.metadata->>'model', 'style', left(coalesce(l.metadata->>'prompt', ''), 300)), l.created_at
from public.usage_logs l
cross join lateral (select coalesce(nullif(l.metadata->>'image_path', ''),
  case when position('/ai-image-generations/' in coalesce(l.metadata->>'image_url', '')) > 0
       then split_part(split_part(l.metadata->>'image_url', '/ai-image-generations/', 2), '?', 1) end) as p) x
where l.action = 'image_generation' and l.program_id = '26b9f0b2-b48b-4f9d-b751-ecb88e98e95e'::uuid
  and x.p like l.user_id::text || '/%'
on conflict (source_table, source_id, source_index) do nothing;

insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, source_table, source_id, source_index, meta, created_at)
select r.user_id, 'banana-canvas', 'image',
  left(coalesce(nullif(r.title, ''), nullif(r.prompt, ''), '바나나 캔버스 결과')
       || case when jsonb_array_length(r.outputs) > 1 then ' (' || o.n || ')' else '' end, 120),
  'banana-canvas-files', o.v->>'path', 'banana_canvas_results', r.id, (o.n - 1)::int,
  jsonb_build_object('model', r.model_used, 'w', o.v->'w', 'h', o.v->'h', 'style', left(coalesce(r.prompt, ''), 300)), r.created_at
from public.banana_canvas_results r
cross join lateral jsonb_array_elements(case when jsonb_typeof(r.outputs) = 'array' then r.outputs else '[]'::jsonb end) with ordinality as o(v, n)
where jsonb_typeof(r.outputs) = 'array' and coalesce(o.v->>'path', '') like r.user_id::text || '/%'
on conflict (source_table, source_id, source_index) do nothing;

insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, source_table, source_id, source_index, bytes, meta, created_at)
select p.user_id, 'portrait-photo', 'image', left(coalesce(nullif(p.purpose_label, ''), '인물 사진'), 120),
  'portrait-photo-files', p.path, 'portrait_photo_saved', p.id, 0, nullif(p.bytes, 0),
  jsonb_build_object('model', p.model, 'aspect', p.aspect), p.created_at
from public.portrait_photo_saved p
where coalesce(p.path, '') like p.user_id::text || '/%'
on conflict (source_table, source_id, source_index) do nothing;

insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, source_table, source_id, source_index, meta, created_at)
select t.user_id, 'thumbnail-master', 'image',
  left(coalesce(nullif(t.name, ''), '썸네일') || ' · ' || s.label || '안 v' || coalesce(v.v->>'v', v.n::text), 120),
  'thumbnail-master-images', v.v->>'path', 'thumbnail_master_projects', t.id, (s.base + v.n - 1)::int,
  jsonb_build_object('model', v.v->>'model', 'style', left(coalesce(v.v->>'main', ''), 300)),
  t.created_at
from public.thumbnail_master_projects t
cross join lateral (values ('A', 0, t.images_a), ('B', 100, t.images_b)) as s(label, base, imgs)
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.imgs->'versions') = 'array' then s.imgs->'versions' else '[]'::jsonb end) with ordinality as v(v, n)
where coalesce(v.v->>'path', '') like t.user_id::text || '/%'
on conflict (source_table, source_id, source_index) do nothing;

commit;

-- 확인: select source_slug, count(*) from public.member_assets where kind = 'image' group by 1;
--  기대(2026-11-11): ai-image-studio 6, thumbnail-master 5, banana-canvas 2, portrait-photo 0
