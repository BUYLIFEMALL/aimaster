-- AI 쇼핑몰 빌더 — 디자인 빌더 D6: 게시 기록·되돌리기 + 분양몰 바닥글 입금 계좌 잠금(DB 쪽 검사, 상호 인수인계 S21·S24 합의)
-- 담당: [역할: mall-design-builder] (프론트 DB 번호 0080~0089). 작업표 D6-1·D6-2·I21
-- 추가만 하는 변경: 새 표 1개 + 새 함수 3개, 프론트 함수 2개(0080) 내용만 바꿈(같은 이름·같은 인자, create or replace).
-- 지우기·권한 회수 문장 없음(docs/mall/LESSONS_LEARNED.md 11-03). mall_builder_stores·분양 함수(백엔드 몫)는 읽기만.
-- 게시 기록 = 「손님 화면에 게시된 그 순간」의 첫 화면(mall_builder_pages.published_blocks) + 디자인 조각 6개(mall_builder_design.published) 한 묶음.
-- 몰당 최근 20개만 남긴다(오래된 기록 정리는 기록 함수 안에서만 — 몰 하나 범위). 되돌리기는 그 판을 「초안」으로만 복사한다(손님 화면은 운영자가 확인하고 게시해야 바뀜).

create table if not exists public.mall_builder_design_history (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default clock_timestamp(), -- 같은 트랜잭션 안 여러 기록도 순서가 갈리게(now()는 트랜잭션 시작 시각)
  created_by uuid references auth.users (id)
);
create index if not exists mall_builder_design_history_store_idx on public.mall_builder_design_history (store_id, created_at desc);

alter table public.mall_builder_design_history enable row level security;
-- 쓰기 정책 없음 — 기록·되돌리기는 아래 함수만
create policy "mall_builder_design_history_staff_read" on public.mall_builder_design_history
  for select using (public.mall_builder_is_store_staff(store_id));

-- 분양몰인가(바닥글 입금 계좌 잠금 판정 — src/lib/builder/policy.ts와 같은 규칙)
create or replace function public.mall_builder_design_is_resale(p_store_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select s.kind = 'resale' from public.mall_builder_stores s where s.id = p_store_id), false);
$$;

-- 0080 함수 내용 바꿈: 분양몰이면 바닥글 초안의 입금 계좌를 늘 보이게(화면·서버 액션을 우회해 함수를 바로 불러도)
create or replace function public.mall_builder_design_save_draft(p_store_id uuid, p_kind text, p_doc jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_at timestamptz := now();
  v_doc jsonb := p_doc;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  if p_kind is null or p_kind not in ('theme', 'header', 'footer', 'popup', 'list', 'detail') then raise exception '디자인 종류가 올바르지 않습니다.'; end if;
  if v_doc is null or jsonb_typeof(v_doc) <> 'object' then raise exception '디자인 모양이 올바르지 않습니다.'; end if;
  if octet_length(v_doc::text) > 20000 then raise exception '디자인 내용이 너무 큽니다.'; end if;
  if p_kind = 'footer' and public.mall_builder_design_is_resale(p_store_id) then
    v_doc := v_doc || '{"show_bank": true}'::jsonb;
  end if;
  insert into public.mall_builder_design (store_id, kind, draft, draft_updated_at, updated_by)
  values (p_store_id, p_kind, v_doc, v_at, auth.uid())
  on conflict (store_id, kind) do update set draft = excluded.draft, draft_updated_at = v_at, updated_by = auth.uid();
  return v_at;
end;
$$;

-- 0080 함수 내용 바꿈: 게시할 때도 분양몰 바닥글은 입금 계좌 보이게(잠금 전에 저장된 초안 대비)
create or replace function public.mall_builder_design_publish(p_store_id uuid, p_kinds text[] default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_at timestamptz := now();
  v_n integer;
  v_resale boolean := public.mall_builder_design_is_resale(p_store_id);
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  update public.mall_builder_design
  set published = case when kind = 'footer' and v_resale then draft || '{"show_bank": true}'::jsonb else draft end,
      published_at = v_at, updated_by = auth.uid()
  where store_id = p_store_id and (p_kinds is null or kind = any (p_kinds));
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception '게시할 초안이 없습니다. 먼저 저장해 주세요.'; end if;
  return v_n;
end;
$$;

-- 운영자: 지금 손님 화면에 게시된 것 전부를 기록 한 줄로(직전 기록과 같으면 새로 남기지 않음). 기록 id(게시본이 하나도 없으면 null)
create or replace function public.mall_builder_design_record(p_store_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_snap jsonb;
  v_last_id uuid;
  v_last_snap jsonb;
  v_id uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  v_snap := public.mall_builder_design_published(p_store_id)
    || coalesce((select jsonb_build_object('home', p.published_blocks) from public.mall_builder_pages p
                 where p.store_id = p_store_id and p.kind = 'home' and p.published_blocks is not null), '{}'::jsonb);
  if v_snap = '{}'::jsonb then return null; end if;
  select h.id, h.snapshot into v_last_id, v_last_snap from public.mall_builder_design_history h
  where h.store_id = p_store_id order by h.created_at desc limit 1;
  if v_last_id is not null and v_last_snap = v_snap then return v_last_id; end if;
  insert into public.mall_builder_design_history (store_id, snapshot, created_by) values (p_store_id, v_snap, auth.uid()) returning id into v_id;
  delete from public.mall_builder_design_history
  where store_id = p_store_id and id not in (
    select h.id from public.mall_builder_design_history h where h.store_id = p_store_id order by h.created_at desc limit 20
  );
  return v_id;
end;
$$;

-- 운영자: 기록 한 줄을 「초안」으로 되돌림(첫 화면 + 기록에 있는 조각). 손님 화면은 게시해야 바뀐다
create or replace function public.mall_builder_design_restore(p_store_id uuid, p_history_id uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_at timestamptz := now();
  v_snap jsonb;
  v_kind text;
  v_doc jsonb;
  v_resale boolean := public.mall_builder_design_is_resale(p_store_id);
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  select h.snapshot into v_snap from public.mall_builder_design_history h where h.id = p_history_id and h.store_id = p_store_id;
  if v_snap is null then raise exception '게시 기록을 찾지 못했습니다.'; end if;
  if jsonb_typeof(v_snap -> 'home') = 'object' then
    insert into public.mall_builder_pages (store_id, kind, draft_blocks, draft_updated_at, updated_by)
    values (p_store_id, 'home', v_snap -> 'home', v_at, auth.uid())
    on conflict (store_id, kind) do update set draft_blocks = excluded.draft_blocks, draft_updated_at = v_at, updated_by = auth.uid();
  end if;
  foreach v_kind in array array['theme', 'header', 'footer', 'popup', 'list', 'detail'] loop
    v_doc := v_snap -> v_kind;
    continue when v_doc is null or jsonb_typeof(v_doc) <> 'object';
    if v_kind = 'footer' and v_resale then v_doc := v_doc || '{"show_bank": true}'::jsonb; end if;
    insert into public.mall_builder_design (store_id, kind, draft, draft_updated_at, updated_by)
    values (p_store_id, v_kind, v_doc, v_at, auth.uid())
    on conflict (store_id, kind) do update set draft = excluded.draft, draft_updated_at = v_at, updated_by = auth.uid();
  end loop;
  return v_at;
end;
$$;
