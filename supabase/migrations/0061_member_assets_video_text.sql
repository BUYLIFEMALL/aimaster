-- 「내 자료함」 3단계 — 영상 3종 + 블로그 원고 6개 연결 (주인님 지시 2026-11-11 「3단계 영상·블로그 원고 연결 진행해」)
-- 플랜: docs/PLAN_20261111_MEMBER_LIBRARY.md §9 · 같은 방식: 0059(음악)·0060(이미지)
-- 원본 줄이 생기면 member_assets에 넣고, 원본 줄이 지워지면 함께 지운다(보관 기간 = 원본 규칙: 생성만 30일 · 발행 1년 · 열외 계정 무기한).
-- 프로그램 코드·배포 변경 없음. 트리거 안에는 실패할 수 있는 형 변환을 넣지 않는다(트리거 오류 = 원본 저장 실패).
--  영상: ai-video-studio(avs_generations.outputs[].path · avs_edits.output_path, 버킷 ai-video-studio), music-video-studio(mvs_renders.output_path, 버킷 music-video-studio)
--  글  : naver-blog-agent(nba_posts) · naver-blog-seo-studio(naver_blog_seo_drafts) · tistory-auto-blog(tistory_posts, 숫자 id)
--        ai-auto-blog(blog_posts, 숫자 id) · naver-blog-allinone(aio_posts) · wp-blogger-auto(wba_posts)
--  숫자 id 표는 md5('표:'||id)::uuid 로 고정 번호를 만들어 source_id에 넣는다(표 구조 변경 없음).
--  글은 내용이 자주 바뀌므로 지웠다 넣지 않고 같은 줄을 고쳐 쓴다(on conflict do update) — 자료함 id 유지.
begin;

-- ── 공용 도우미 ────────────────────────────────────────────────────────────
create or replace function public.member_assets_put_text(
  p_user uuid, p_slug text, p_table text, p_id uuid, p_title text, p_body text,
  p_status text, p_url text, p_published_at text, p_created timestamptz
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null then return; end if;
  insert into public.member_assets (user_id, source_slug, kind, title, url, source_table, source_id, source_index, meta, created_at)
  values (p_user, p_slug, 'text', left(coalesce(nullif(btrim(p_title), ''), '제목 없는 원고'), 120),
    case when coalesce(p_url, '') like 'https://%' then p_url end, p_table, p_id, 0,
    jsonb_build_object(
      'excerpt', left(btrim(regexp_replace(regexp_replace(coalesce(p_body, ''), '<[^>]*>', ' ', 'g'), '\s+', ' ', 'g')), 200),
      'status', p_status,
      'published', coalesce(p_status, '') = 'published' or (nullif(p_published_at, '') is not null and coalesce(p_status, '') in ('completed', 'done', 'success')),
      'published_at', p_published_at),
    coalesce(p_created, now()))
  on conflict (source_table, source_id, source_index) do update
    set title = excluded.title, url = excluded.url, meta = excluded.meta;
end $$;

create or replace function public.member_assets_drop(p_table text, p_id uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.member_assets where source_table = p_table and source_id = p_id;
$$;

-- ── 영상 1) AI 영상 스튜디오 생성 결과 ─────────────────────────────────────────
create or replace function public.member_assets_sync_avs_gen() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o jsonb; i int := 0;
begin
  if tg_op = 'DELETE' then perform public.member_assets_drop('avs_generations', old.id); return old; end if;
  perform public.member_assets_drop('avs_generations', new.id);
  if new.status = 'completed' and jsonb_typeof(new.outputs) = 'array' then
    for o in select * from jsonb_array_elements(new.outputs) loop
      if coalesce(o->>'path', '') like new.user_id::text || '/%' then
        insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, source_table, source_id, source_index, meta, created_at)
        values (new.user_id, 'ai-video-studio', 'video',
          left(coalesce(nullif(new.prompt, ''), 'AI 영상') || case when jsonb_array_length(new.outputs) > 1 then ' (' || (i + 1) || ')' else '' end, 120),
          'ai-video-studio', o->>'path', 'avs_generations', new.id, i,
          jsonb_build_object('model', new.model, 'provider', new.provider, 'aspect', new.aspect_ratio, 'duration', new.duration_s, 'style', left(coalesce(new.prompt, ''), 300)),
          new.created_at)
        on conflict (source_table, source_id, source_index) do nothing;
      end if;
      i := i + 1;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists member_assets_sync_avs_gen on public.avs_generations;
create trigger member_assets_sync_avs_gen after insert or update of status, outputs or delete on public.avs_generations
  for each row execute function public.member_assets_sync_avs_gen();

-- ── 영상 2) AI 영상 스튜디오 편집 결과 ─────────────────────────────────────────
create or replace function public.member_assets_sync_avs_edit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then perform public.member_assets_drop('avs_edits', old.id); return old; end if;
  perform public.member_assets_drop('avs_edits', new.id);
  if coalesce(new.output_path, '') like new.user_id::text || '/%' then
    insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, source_table, source_id, source_index, bytes, meta, created_at)
    values (new.user_id, 'ai-video-studio', 'video', left(coalesce(nullif(new.title, ''), 'AI 영상 편집'), 120),
      'ai-video-studio', new.output_path, 'avs_edits', new.id, 0, new.output_bytes,
      jsonb_build_object('duration', new.duration_s, 'edit', true), new.created_at)
    on conflict (source_table, source_id, source_index) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists member_assets_sync_avs_edit on public.avs_edits;
create trigger member_assets_sync_avs_edit after insert or update of output_path, title or delete on public.avs_edits
  for each row execute function public.member_assets_sync_avs_edit();

-- ── 영상 3) 뮤직비디오 렌더 ────────────────────────────────────────────────
create or replace function public.member_assets_sync_mvs() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then perform public.member_assets_drop('mvs_renders', old.id); return old; end if;
  perform public.member_assets_drop('mvs_renders', new.id);
  if coalesce(new.output_path, '') like new.user_id::text || '/%' then
    insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, source_table, source_id, source_index, bytes, meta, created_at)
    values (new.user_id, 'music-video-studio', 'video', left(coalesce(nullif(new.title, ''), nullif(new.song_title, ''), '뮤직비디오'), 120),
      'music-video-studio', new.output_path, 'mvs_renders', new.id, 0, new.output_bytes,
      jsonb_build_object('duration', new.duration_s, 'w', new.width, 'h', new.height, 'song', new.song_title), new.created_at)
    on conflict (source_table, source_id, source_index) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists member_assets_sync_mvs on public.mvs_renders;
create trigger member_assets_sync_mvs after insert or update of output_path, title or delete on public.mvs_renders
  for each row execute function public.member_assets_sync_mvs();

-- ── 글 1) 네이버 블로그 에이전트 ───────────────────────────────────────────
create or replace function public.member_assets_sync_nba() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then perform public.member_assets_drop('nba_posts', old.id); return old; end if;
  perform public.member_assets_put_text(new.user_id, 'naver-blog-agent', 'nba_posts', new.id, new.title::text, new.content::text, new.status::text, new.post_url::text, new.published_at::text, new.created_at::timestamptz);
  return new;
end $$;
drop trigger if exists member_assets_sync_nba on public.nba_posts;
create trigger member_assets_sync_nba after insert or update of title, content, status, post_url, published_at or delete on public.nba_posts
  for each row execute function public.member_assets_sync_nba();

-- ── 글 2) 네이버 블로그 SEO 스튜디오 ───────────────────────────────────────
create or replace function public.member_assets_sync_seo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then perform public.member_assets_drop('naver_blog_seo_drafts', old.id); return old; end if;
  perform public.member_assets_put_text(new.user_id, 'naver-blog-seo-studio', 'naver_blog_seo_drafts', new.id, new.title::text, new.body::text,
    coalesce(nullif(new.naver_input_status::text, 'not_started'), new.status::text), null::text, new.naver_input_completed_at::text, new.created_at::timestamptz);
  return new;
end $$;
drop trigger if exists member_assets_sync_seo on public.naver_blog_seo_drafts;
create trigger member_assets_sync_seo after insert or update of title, body, status, naver_input_status, naver_input_completed_at or delete on public.naver_blog_seo_drafts
  for each row execute function public.member_assets_sync_seo();

-- ── 글 3) 티스토리(숫자 id) ────────────────────────────────────────────────
create or replace function public.member_assets_sync_tistory() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then perform public.member_assets_drop('tistory_posts', md5('tistory_posts:' || old.id)::uuid); return old; end if;
  perform public.member_assets_put_text(new.user_id, 'tistory-auto-blog', 'tistory_posts', md5('tistory_posts:' || new.id)::uuid,
    new.title::text, coalesce(nullif(new.excerpt::text, ''), new.content::text), new.tistory_input_status::text, null::text, new.tistory_input_completed_at::text, new.created_at::timestamptz);
  return new;
end $$;
drop trigger if exists member_assets_sync_tistory on public.tistory_posts;
create trigger member_assets_sync_tistory after insert or update of title, excerpt, content, tistory_input_status, tistory_input_completed_at, user_id or delete on public.tistory_posts
  for each row execute function public.member_assets_sync_tistory();

-- ── 글 4) 블로그 포스팅 자동화(숫자 id) ─────────────────────────────────────
create or replace function public.member_assets_sync_blog() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then perform public.member_assets_drop('blog_posts', md5('blog_posts:' || old.id)::uuid); return old; end if;
  perform public.member_assets_put_text(new.user_id, 'ai-auto-blog', 'blog_posts', md5('blog_posts:' || new.id)::uuid,
    new.title::text, coalesce(nullif(new.excerpt::text, ''), new.content::text), new.naver_input_status::text, null::text, new.naver_input_completed_at::text, new.created_at::timestamptz);
  return new;
end $$;
drop trigger if exists member_assets_sync_blog on public.blog_posts;
create trigger member_assets_sync_blog after insert or update of title, excerpt, content, naver_input_status, naver_input_completed_at, user_id or delete on public.blog_posts
  for each row execute function public.member_assets_sync_blog();

-- ── 글 5) 네이버 블로그 올인원 ─────────────────────────────────────────────
create or replace function public.member_assets_sync_aio() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then perform public.member_assets_drop('aio_posts', old.id); return old; end if;
  perform public.member_assets_put_text(new.user_id, 'naver-blog-allinone', 'aio_posts', new.id, new.title::text,
    coalesce(nullif(new.summary::text, ''), new.article::text), new.review_status::text, null::text, null::text, new.created_at::timestamptz);
  return new;
end $$;
drop trigger if exists member_assets_sync_aio on public.aio_posts;
create trigger member_assets_sync_aio after insert or update of title, summary, article, review_status or delete on public.aio_posts
  for each row execute function public.member_assets_sync_aio();

-- ── 글 6) 워드프레스·구글 블로그 ──────────────────────────────────────────
create or replace function public.member_assets_sync_wba() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then perform public.member_assets_drop('wba_posts', old.id); return old; end if;
  perform public.member_assets_put_text(new.user_id, 'wp-blogger-auto', 'wba_posts', new.id, new.title::text,
    coalesce(nullif(new.excerpt::text, ''), new.html::text), new.status::text, new.remote_url::text, new.published_at::text, new.created_at::timestamptz);
  return new;
end $$;
drop trigger if exists member_assets_sync_wba on public.wba_posts;
create trigger member_assets_sync_wba after insert or update of title, excerpt, html, status, remote_url, published_at or delete on public.wba_posts
  for each row execute function public.member_assets_sync_wba();

revoke execute on function public.member_assets_put_text(uuid, text, text, uuid, text, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.member_assets_drop(text, uuid) from public, anon, authenticated;
revoke execute on function public.member_assets_sync_avs_gen() from public, anon, authenticated;
revoke execute on function public.member_assets_sync_avs_edit() from public, anon, authenticated;
revoke execute on function public.member_assets_sync_mvs() from public, anon, authenticated;
revoke execute on function public.member_assets_sync_nba() from public, anon, authenticated;
revoke execute on function public.member_assets_sync_seo() from public, anon, authenticated;
revoke execute on function public.member_assets_sync_tistory() from public, anon, authenticated;
revoke execute on function public.member_assets_sync_blog() from public, anon, authenticated;
revoke execute on function public.member_assets_sync_aio() from public, anon, authenticated;
revoke execute on function public.member_assets_sync_wba() from public, anon, authenticated;

-- ── 기존 자료 채우기(원본은 건드리지 않음) ─────────────────────────────────────
insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, source_table, source_id, source_index, meta, created_at)
select g.user_id, 'ai-video-studio', 'video',
  left(coalesce(nullif(g.prompt, ''), 'AI 영상') || case when jsonb_array_length(g.outputs) > 1 then ' (' || o.n || ')' else '' end, 120),
  'ai-video-studio', o.v->>'path', 'avs_generations', g.id, (o.n - 1)::int,
  jsonb_build_object('model', g.model, 'provider', g.provider, 'aspect', g.aspect_ratio, 'duration', g.duration_s, 'style', left(coalesce(g.prompt, ''), 300)),
  g.created_at
from public.avs_generations g
cross join lateral jsonb_array_elements(case when jsonb_typeof(g.outputs) = 'array' then g.outputs else '[]'::jsonb end) with ordinality as o(v, n)
where g.status = 'completed' and coalesce(o.v->>'path', '') like g.user_id::text || '/%'
on conflict (source_table, source_id, source_index) do nothing;

insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, source_table, source_id, source_index, bytes, meta, created_at)
select e.user_id, 'ai-video-studio', 'video', left(coalesce(nullif(e.title, ''), 'AI 영상 편집'), 120),
  'ai-video-studio', e.output_path, 'avs_edits', e.id, 0, e.output_bytes, jsonb_build_object('duration', e.duration_s, 'edit', true), e.created_at
from public.avs_edits e where coalesce(e.output_path, '') like e.user_id::text || '/%'
on conflict (source_table, source_id, source_index) do nothing;

insert into public.member_assets (user_id, source_slug, kind, title, bucket, path, source_table, source_id, source_index, bytes, meta, created_at)
select r.user_id, 'music-video-studio', 'video', left(coalesce(nullif(r.title, ''), nullif(r.song_title, ''), '뮤직비디오'), 120),
  'music-video-studio', r.output_path, 'mvs_renders', r.id, 0, r.output_bytes,
  jsonb_build_object('duration', r.duration_s, 'w', r.width, 'h', r.height, 'song', r.song_title), r.created_at
from public.mvs_renders r where coalesce(r.output_path, '') like r.user_id::text || '/%'
on conflict (source_table, source_id, source_index) do nothing;

select public.member_assets_put_text(p.user_id, 'naver-blog-agent', 'nba_posts', p.id, p.title::text, p.content::text, p.status::text, p.post_url::text, p.published_at::text, p.created_at::timestamptz) from public.nba_posts p where p.user_id is not null;
select public.member_assets_put_text(d.user_id, 'naver-blog-seo-studio', 'naver_blog_seo_drafts', d.id, d.title::text, d.body::text,
  coalesce(nullif(d.naver_input_status::text, 'not_started'), d.status::text), null::text, d.naver_input_completed_at::text, d.created_at::timestamptz) from public.naver_blog_seo_drafts d where d.user_id is not null;
select public.member_assets_put_text(t.user_id, 'tistory-auto-blog', 'tistory_posts', md5('tistory_posts:' || t.id)::uuid, t.title::text,
  coalesce(nullif(t.excerpt::text, ''), t.content::text), t.tistory_input_status::text, null::text, t.tistory_input_completed_at::text, t.created_at::timestamptz) from public.tistory_posts t where t.user_id is not null;
select public.member_assets_put_text(b.user_id, 'ai-auto-blog', 'blog_posts', md5('blog_posts:' || b.id)::uuid, b.title::text,
  coalesce(nullif(b.excerpt::text, ''), b.content::text), b.naver_input_status::text, null::text, b.naver_input_completed_at::text, b.created_at::timestamptz) from public.blog_posts b where b.user_id is not null;
select public.member_assets_put_text(a.user_id, 'naver-blog-allinone', 'aio_posts', a.id, a.title::text, coalesce(nullif(a.summary::text, ''), a.article::text), a.review_status::text, null::text, null::text, a.created_at::timestamptz) from public.aio_posts a where a.user_id is not null;
select public.member_assets_put_text(w.user_id, 'wp-blogger-auto', 'wba_posts', w.id, w.title::text, coalesce(nullif(w.excerpt::text, ''), w.html::text), w.status::text, w.remote_url::text, w.published_at::text, w.created_at::timestamptz) from public.wba_posts w where w.user_id is not null;

commit;

-- 확인: select source_slug, kind, count(*) from public.member_assets where kind in ('video','text') group by 1, 2;
--  기대(2026-11-11): ai-video-studio 24(생성 23 + 편집 1), music-video-studio 1,
--                    naver-blog-agent 34, naver-blog-seo-studio 25, tistory-auto-blog 19, ai-auto-blog 15, naver-blog-allinone 6, wp-blogger-auto 8
