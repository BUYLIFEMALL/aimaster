-- AI 쇼핑몰 빌더 — 디자인 표(0080 mall_builder_design)의 로고·팝업 그림도 「쓰는 사진」으로 본다 (2026-11-14, 프론트 S12·S17 요청)
-- 헤더·바닥글 로고와 첫 화면 팝업 그림이 mall_builder_design(kind header·footer·popup …)의 draft·published에 들어간다(버킷 mall-builder-public, <몰>/banners/…).
-- 고치지 않으면 ① 사진 30일 후보(0066 mall_builder_expired_photos)에 잡혀 지워지고 ② 관리자 「사진」 화면(0022 mall_builder_store_files)에 「안 쓰는 사진」으로 보인다.
-- 0073이 0080보다 먼저 적용될 수 있으므로(번호 순) 표가 있을 때만 읽는 도우미로 붙인다. 함수 일부 바꾸기만(drop 없음).

-- 1. 도우미: 그 몰 디자인 조각 전부(초안·게시본) 글자. 표가 없으면 빈 글자
create or replace function mall_builder_private.design_refs(p_store uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v text;
begin
  if to_regclass('public.mall_builder_design') is null then return ''; end if;
  execute 'select coalesce(string_agg(coalesce(d.draft::text, '''') || '' '' || coalesce(d.published::text, ''''), '' ''), '''')
             from public.mall_builder_design d where d.store_id = $1' into v using p_store;
  return coalesce(v, '');
end;
$$;
revoke all on function mall_builder_private.design_refs(uuid) from public, anon, authenticated;

create or replace function pg_temp.swap(src text, a text, b text, what text) returns text language plpgsql as $f$
begin
  if (char_length(src) - char_length(replace(src, a, ''))) / char_length(a) <> 1 then raise exception '문구를 1번 찾지 못함: %', what; end if;
  return replace(src, a, b);
end $f$;

do $m$
declare src text;
begin
  -- 2. 사진 30일 후보(0066)
  src := pg_get_functiondef('public.mall_builder_expired_photos(integer)'::regprocedure);
  src := pg_temp.swap(src,
    'select coalesce(st.settings::text, '''') || '' '' || coalesce(st.business_info::text, '''') from public.mall_builder_stores st where st.id = s.id',
    'select coalesce(st.settings::text, '''') || '' '' || coalesce(st.business_info::text, '''') || '' '' || mall_builder_private.design_refs(s.id) from public.mall_builder_stores st where st.id = s.id',
    '30일 후보 — 디자인 표');
  execute src;

  -- 3. 관리자 「사진」 화면 쓰임 확인(0022, 0066에서 로고 줄 추가됨)
  src := pg_get_functiondef('public.mall_builder_store_files(uuid)'::regprocedure);
  src := pg_temp.swap(src,
    'select coalesce(st.settings::text, '''') from public.mall_builder_stores st where st.id = p_store',
    'select coalesce(st.settings::text, '''') || '' '' || mall_builder_private.design_refs(p_store) from public.mall_builder_stores st where st.id = p_store',
    '사진 쓰임 — 디자인 표');
  execute src;
end $m$;
