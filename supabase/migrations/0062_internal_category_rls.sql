-- REA 등 비공개(내부) 카테고리를 DB 읽기 권한(RLS)에서도 숨긴다 (주인님 지시 2026-11-11 「REA 프로그램 정보를 DB 권한에서도 막는 작업」)
-- 지침: docs/REA_CATEGORY_POLICY.md §3 한계 해소 · 0058(can_view_internal) 다음 단계
-- 변경 전: categories_select_all = true(누구나), programs_select_active = is_active(누구나)
-- 변경 후: 공개 카테고리·그 프로그램은 지금과 똑같이 누구나. 비공개 카테고리·그 프로그램은 관리자 또는 can_view_internal 회원만.
--          관리자 전체 권한 정책(admin_all_*)은 그대로. 서버 키(service role)는 RLS를 우회하므로 하위 프로그램 권한 판정·관리 화면 영향 없음.
begin;

-- 로그인 회원이 내부 카테고리를 볼 수 있는지(관리자 또는 can_view_internal). 비로그인 = false.
create or replace function public.member_can_view_internal() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_admin or p.can_view_internal from public.profiles p where p.id = auth.uid()), false);
$$;
-- 카테고리가 비공개(내부)인지 — 정책 안에서 categories RLS를 다시 타지 않게 security definer로
create or replace function public.category_is_internal(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select not c.is_public from public.categories c where c.id = cid), false);
$$;
grant execute on function public.member_can_view_internal() to anon, authenticated;
grant execute on function public.category_is_internal(uuid) to anon, authenticated;

drop policy if exists categories_select_all on public.categories;
create policy categories_select_all on public.categories for select
  using (is_public or public.member_can_view_internal());

drop policy if exists programs_select_active on public.programs;
create policy programs_select_active on public.programs for select
  using (is_active = true and (category_id is null or not public.category_is_internal(category_id) or public.member_can_view_internal()));

commit;

-- 확인(읽기 전용, 되돌림):
-- begin; set local role anon; select count(*) from public.categories; select count(*) from public.programs; rollback;
-- begin; set local role authenticated; set local request.jwt.claims = '{"sub":"<can_view_internal 회원 id>","role":"authenticated"}';
--        select count(*) from public.categories where slug = 'rea'; rollback;
