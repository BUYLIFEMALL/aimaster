-- AI 쇼핑몰 빌더 F18 — 첫 화면 블록 편집(초안 저장 → 게시)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경. 지우기·권한 회수 문장 없음(docs/mall/LESSONS_LEARNED.md 점검 목록).
-- 적용은 둘로 나눔: mall_builder_0016a_pages_table(표·보안 규칙) / mall_builder_0016b_pages_functions(함수 3개)
-- 초안(draft_blocks)은 손님에게 보이면 안 되므로 표 읽기는 운영자만. 손님 화면은 게시본만 돌려주는 함수로 읽는다.
-- 블록 내용 검사(종류·링크·그림 주소)는 앱의 src/lib/blocks.ts validateDoc이 하고, DB는 모양·크기만 다시 확인한다.

-- ── 0016a ──
create table if not exists public.mall_builder_pages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  kind text not null default 'home' check (kind in ('home')),
  draft_blocks jsonb not null default '{"schema_version": 1, "blocks": []}'::jsonb,
  published_blocks jsonb,
  draft_updated_at timestamptz not null default now(),
  published_at timestamptz,
  updated_by uuid references auth.users (id),
  unique (store_id, kind)
);

alter table public.mall_builder_pages enable row level security;
-- 쓰기 정책 없음 — 저장·게시는 아래 함수만
create policy "mall_builder_pages_staff_read" on public.mall_builder_pages
  for select using (public.mall_builder_is_store_staff(store_id));

-- ── 0016b ──
-- 운영자: 초안 저장(없으면 만든다)
create or replace function public.mall_builder_save_page_draft(p_store_id uuid, p_doc jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_at timestamptz := now();
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  if jsonb_typeof(p_doc) <> 'object' or jsonb_typeof(p_doc -> 'blocks') <> 'array' then raise exception '블록 모양이 올바르지 않습니다.'; end if;
  if jsonb_array_length(p_doc -> 'blocks') > 30 then raise exception '블록은 30개까지 넣을 수 있습니다.'; end if;
  if octet_length(p_doc::text) > 100000 then raise exception '첫 화면 내용이 너무 큽니다.'; end if;
  insert into public.mall_builder_pages (store_id, kind, draft_blocks, draft_updated_at, updated_by)
  values (p_store_id, 'home', p_doc, v_at, auth.uid())
  on conflict (store_id, kind) do update set draft_blocks = excluded.draft_blocks, draft_updated_at = v_at, updated_by = auth.uid();
  return v_at;
end;
$$;

-- 운영자: 지금 초안을 손님 화면에 게시
create or replace function public.mall_builder_publish_page(p_store_id uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_at timestamptz := now();
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  update public.mall_builder_pages set published_blocks = draft_blocks, published_at = v_at, updated_by = auth.uid()
  where store_id = p_store_id and kind = 'home';
  if not found then raise exception '저장된 초안이 없습니다. 먼저 저장해 주세요.'; end if;
  return v_at;
end;
$$;

-- 누구나: 게시된 첫 화면만(초안은 돌려주지 않는다). 게시 전이면 null
create or replace function public.mall_builder_published_page(p_store_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select p.published_blocks from public.mall_builder_pages p where p.store_id = p_store_id and p.kind = 'home';
$$;
