-- AI 쇼핑몰 빌더 — 디자인 빌더 D1-5: 손님 화면 디자인 조각(테마·헤더·바닥글·팝업·목록·상세) 초안/게시
-- 담당: [역할: mall-design-builder] (프론트 DB 번호 0080~0089). 플랜 mall-builder/docs/PLAN_20261114_DESIGN_BUILDER.md §3-1
-- 처음 계획은 mall_builder_pages.kind 확장이었으나, 제약 변경은 지우는 문장이 필요해(docs/mall/LESSONS_LEARNED.md 11-03) 새 표로 바꿈.
-- 추가만 하는 변경: 새 표 1개 + 함수 3개. 지우기·권한 회수 문장 없음. 첫 화면(mall_builder_pages, kind 'home')과 기존 함수는 그대로.
-- 초안은 손님에게 보이면 안 되므로 표 읽기는 운영자만, 손님 화면은 게시본만 돌려주는 함수로 읽는다.
-- 내용 검사는 앱(src/lib/theme.ts 등)이 하고, DB는 종류·모양·크기만 다시 확인한다.

create table if not exists public.mall_builder_design (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  kind text not null check (kind in ('theme', 'header', 'footer', 'popup', 'list', 'detail')),
  draft jsonb not null default '{}'::jsonb,
  published jsonb,
  draft_updated_at timestamptz not null default now(),
  published_at timestamptz,
  updated_by uuid references auth.users (id),
  unique (store_id, kind)
);

alter table public.mall_builder_design enable row level security;
-- 쓰기 정책 없음 — 저장·게시는 아래 함수만
create policy "mall_builder_design_staff_read" on public.mall_builder_design
  for select using (public.mall_builder_is_store_staff(store_id));

-- 운영자: 디자인 조각 하나의 초안 저장(없으면 만든다)
create or replace function public.mall_builder_design_save_draft(p_store_id uuid, p_kind text, p_doc jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_at timestamptz := now();
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  if p_kind is null or p_kind not in ('theme', 'header', 'footer', 'popup', 'list', 'detail') then raise exception '디자인 종류가 올바르지 않습니다.'; end if;
  if p_doc is null or jsonb_typeof(p_doc) <> 'object' then raise exception '디자인 모양이 올바르지 않습니다.'; end if;
  if octet_length(p_doc::text) > 20000 then raise exception '디자인 내용이 너무 큽니다.'; end if;
  insert into public.mall_builder_design (store_id, kind, draft, draft_updated_at, updated_by)
  values (p_store_id, p_kind, p_doc, v_at, auth.uid())
  on conflict (store_id, kind) do update set draft = excluded.draft, draft_updated_at = v_at, updated_by = auth.uid();
  return v_at;
end;
$$;

-- 운영자: 고른 조각들(비우면 초안이 있는 전부)을 한 번에 손님 화면에 게시. 게시한 개수를 돌려준다
create or replace function public.mall_builder_design_publish(p_store_id uuid, p_kinds text[] default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_at timestamptz := now();
  v_n integer;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  update public.mall_builder_design set published = draft, published_at = v_at, updated_by = auth.uid()
  where store_id = p_store_id and (p_kinds is null or kind = any (p_kinds));
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception '게시할 초안이 없습니다. 먼저 저장해 주세요.'; end if;
  return v_n;
end;
$$;

-- 누구나: 게시된 조각만 { kind: 내용 } 하나로(초안은 돌려주지 않는다). 하나도 없으면 빈 객체
create or replace function public.mall_builder_design_published(p_store_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(d.kind, d.published), '{}'::jsonb)
  from public.mall_builder_design d
  where d.store_id = p_store_id and d.published is not null;
$$;
