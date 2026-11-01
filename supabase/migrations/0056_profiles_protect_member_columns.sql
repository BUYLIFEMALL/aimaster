-- 회원이 공개 키로 자기 profiles 행의 권한 칸을 바꾸지 못하게 막는다(주인님 승인 2026-11-01).
-- 근거: docs/HANDOFF.md 2026-11-01 [역할: workspace]. 회원 코드가 직접 고치는 칸은 name·phone뿐이다.
-- 서버 키와 SECURITY DEFINER 함수는 current_user가 회원 역할이 아니어서 그대로 동작한다.
begin;

create or replace function public.profiles_protect_member_columns() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_admin := false;
      new.grade_id := null;
      new.grade_assigned_at := now();
      new.is_suspended := false;
      new.suspended_at := null;
      new.suspended_reason := null;
      new.created_at := now();
    elsif new.is_admin is distinct from old.is_admin
       or new.grade_id is distinct from old.grade_id
       or new.grade_assigned_at is distinct from old.grade_assigned_at
       or new.is_suspended is distinct from old.is_suspended
       or new.suspended_at is distinct from old.suspended_at
       or new.suspended_reason is distinct from old.suspended_reason
       or new.created_at is distinct from old.created_at
       or new.referred_by is distinct from old.referred_by
       or new.affiliate_code is distinct from old.affiliate_code then
      raise exception 'protected profile columns cannot be changed by members' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_member_columns on public.profiles;
create trigger profiles_protect_member_columns before insert or update on public.profiles
  for each row execute function public.profiles_protect_member_columns();

commit;
