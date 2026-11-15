-- AI 쇼핑몰 빌더 M2-5 — 몰 이용약관·개인정보 처리방침 (2026-11-15 docs/PLAN_20261114_B2B_MASTER.md M2-5)
-- 백엔드 DB 번호 0090~0099(0095는 프론트). 표 하나 + 저장 함수 하나(지우기 없음).
-- · 누구나 읽음(유저 화면·검색엔진 공개 문서). 쓰기는 대표 운영사만, 저장 함수로만(표에 직접 쓰는 규칙 없음).
-- · 분양몰은 본사(판매·발송 주체) 문서를 그대로 보여 준다(화면이 원본 몰 행을 읽음) — 분양몰 대표는 저장할 수 없다.

create table if not exists public.mall_builder_store_policies (
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  kind text not null check (kind in ('terms', 'privacy')),
  body text not null default '' check (char_length(body) <= 60000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  primary key (store_id, kind)
);
alter table public.mall_builder_store_policies enable row level security;
drop policy if exists mall_builder_store_policies_read on public.mall_builder_store_policies;
create policy mall_builder_store_policies_read on public.mall_builder_store_policies for select using (true);

create or replace function public.mall_builder_policy_save(p_store_id uuid, p_kind text, p_body text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare v_kind text; v_at timestamptz := now();
begin
  if not public.mall_builder_is_store_owner(p_store_id) then raise exception '대표 운영사만 약관을 고칠 수 있습니다.'; end if;
  select s.kind into v_kind from public.mall_builder_stores s where s.id = p_store_id;
  if v_kind = 'resale' then raise exception '분양몰은 본사 약관을 그대로 씁니다.'; end if;
  if p_kind not in ('terms', 'privacy') then raise exception '약관 종류가 올바르지 않습니다.'; end if;
  if char_length(coalesce(p_body, '')) > 60000 then raise exception '약관은 60,000자 이내로 입력해 주세요.'; end if;
  insert into public.mall_builder_store_policies (store_id, kind, body, updated_at, updated_by)
  values (p_store_id, p_kind, btrim(coalesce(p_body, '')), v_at, auth.uid())
  on conflict (store_id, kind) do update set body = excluded.body, updated_at = excluded.updated_at, updated_by = excluded.updated_by;
  return v_at;
end;
$$;
revoke all on function public.mall_builder_policy_save(uuid, text, text) from public, anon;
grant execute on function public.mall_builder_policy_save(uuid, text, text) to authenticated;
