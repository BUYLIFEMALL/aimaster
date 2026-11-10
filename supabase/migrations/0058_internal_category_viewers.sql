-- 내부(비공개) 카테고리 열람 계정 — REA 카테고리 내부 분석용 (주인님 지시·결정 2026-11-11)
-- 지침: CLAUDE.md 최상위 「REA 카테고리 = 내부 분석용」, 상세 docs/REA_CATEGORY_POLICY.md
-- 규칙: categories.is_public = false 인 카테고리의 프로그램은 관리자(is_admin) + 이 칸이 켜진 계정에게만 보인다.
-- 범위: 표시 칸 + 회원 직접 변경 차단 트리거(0052 retention_exempt와 같은 방식) + 시험 계정 1명 지정 + REA 카테고리 비공개.
begin;

alter table public.profiles add column if not exists can_view_internal boolean not null default false;
comment on column public.profiles.can_view_internal is '비공개(내부) 카테고리 프로그램 열람 허용 — 관리자는 이 칸 없이도 허용. 회원이 직접 바꿀 수 없음';

-- 일반 회원은 profiles 자기 행을 수정할 수 있으므로 이 칸만 막는다
create or replace function public.profiles_protect_can_view_internal() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.can_view_internal := false;
    elsif new.can_view_internal is distinct from old.can_view_internal then
      raise exception 'can_view_internal cannot be changed by members' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_can_view_internal on public.profiles;
create trigger profiles_protect_can_view_internal before insert or update of can_view_internal on public.profiles
  for each row execute function public.profiles_protect_can_view_internal();

-- 시험 계정(일반 회원 권한)만 켠다. 관리자는 is_admin으로 이미 허용된다.
update public.profiles set can_view_internal = true
where id in (select id from auth.users where email = 'buylifemall@naver.com');

-- REA 카테고리를 비공개(내부용)로
update public.categories set is_public = false where slug = 'rea';

do $$
begin
  if (select count(*) from public.profiles where can_view_internal) <> 1 then
    raise exception 'can_view_internal must be set on exactly 1 account';
  end if;
  if (select is_public from public.categories where slug = 'rea') is distinct from false then
    raise exception 'rea category must be private';
  end if;
end $$;

commit;

-- 확인: select p.can_view_internal, u.email from public.profiles p join auth.users u on u.id = p.id where p.can_view_internal;
--       select slug, is_public from public.categories where is_public = false;
