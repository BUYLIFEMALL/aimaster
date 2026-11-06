-- AI 쇼핑몰 빌더 D13 — 상품 후기·상품 문의·1:1 문의·FAQ
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(docs/mall/LESSONS_LEARNED.md 점검 목록).
-- 적용은 셋으로 나눔: 0033a 표·규칙 / 0033b FAQ 운영자 삭제 규칙 / 0033c 함수
-- 후기·문의 표: 읽기는 운영자·본인만, 쓰기 규칙 없음 → 아래 security definer 함수로만 쓴다.
--   손님에게 보이는 목록은 이름을 가리고(김**) 비밀글 내용을 가려 돌려주는 함수로 읽는다(F18 게시본 함수와 같은 방식).
-- 지우기는 표시 칸(is_deleted·is_hidden)으로만 — 함수 안에 delete 문장 없음.

-- ── 0033a ──
create table if not exists public.mall_builder_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  product_id uuid not null references public.mall_builder_products (id) on delete cascade,
  order_item_id uuid not null unique references public.mall_builder_order_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid not null references public.mall_builder_store_customers (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(btrim(body)) between 5 and 2000),
  is_hidden boolean not null default false,
  is_deleted boolean not null default false,
  reply text check (reply is null or char_length(reply) between 1 and 2000),
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mall_builder_reviews_product on public.mall_builder_reviews (product_id, created_at desc);
create index if not exists mall_builder_reviews_store on public.mall_builder_reviews (store_id, created_at desc);
alter table public.mall_builder_reviews enable row level security;
create policy "mall_builder_reviews_read" on public.mall_builder_reviews
  for select using (public.mall_builder_is_store_staff(store_id) or user_id = auth.uid());

create table if not exists public.mall_builder_inquiries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  kind text not null check (kind in ('product', 'personal')),
  product_id uuid references public.mall_builder_products (id) on delete set null,
  order_id uuid references public.mall_builder_orders (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid not null references public.mall_builder_store_customers (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  is_secret boolean not null default false,
  is_hidden boolean not null default false,
  is_deleted boolean not null default false,
  answer text check (answer is null or char_length(answer) between 1 and 3000),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mall_builder_inquiries_product on public.mall_builder_inquiries (product_id, created_at desc);
create index if not exists mall_builder_inquiries_store on public.mall_builder_inquiries (store_id, created_at desc);
create index if not exists mall_builder_inquiries_user on public.mall_builder_inquiries (user_id, created_at desc);
alter table public.mall_builder_inquiries enable row level security;
create policy "mall_builder_inquiries_read" on public.mall_builder_inquiries
  for select using (public.mall_builder_is_store_staff(store_id) or user_id = auth.uid());

create table if not exists public.mall_builder_faqs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  category text not null default '' check (char_length(category) <= 20),
  question text not null check (char_length(btrim(question)) between 1 and 200),
  answer text not null check (char_length(btrim(answer)) between 1 and 3000),
  sort integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mall_builder_faqs_list on public.mall_builder_faqs (store_id, sort, created_at);
alter table public.mall_builder_faqs enable row level security;
create policy "mall_builder_faqs_read" on public.mall_builder_faqs
  for select using (public.mall_builder_is_store_staff(store_id) or (is_published and exists (
    select 1 from public.mall_builder_stores s where s.id = store_id and s.status = 'active'
  )));
create policy "mall_builder_faqs_insert" on public.mall_builder_faqs
  for insert with check (public.mall_builder_is_store_staff(store_id));
create policy "mall_builder_faqs_update" on public.mall_builder_faqs
  for update using (public.mall_builder_is_store_staff(store_id)) with check (public.mall_builder_is_store_staff(store_id));

-- ── 0033b ──
create policy "mall_builder_faqs_delete" on public.mall_builder_faqs
  for delete using (public.mall_builder_is_store_staff(store_id));

-- ── 0033c ──
-- 함수 정의만 만든다. 지금 지워지는 데이터는 없다(함수 안에도 delete 문장 없음).

-- 이름 가리기: 첫 글자 + **
create or replace function public.mall_builder_mask_name(p_name text)
returns text language sql immutable set search_path = '' as $$
  select case when coalesce(btrim(p_name), '') = '' then '손님' else left(btrim(p_name), 1) || '**' end;
$$;

-- 후기 쓰기·고치기: 내 주문의 배송 완료·구매 확정 품목만, 품목마다 1개(다시 쓰면 고침)
create or replace function public.mall_builder_review_write(p_order_item_id uuid, p_rating integer, p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item record;
  v_customer uuid;
  v_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception '별점을 1~5개 사이로 골라 주세요.'; end if;
  if char_length(v_body) < 5 then raise exception '후기는 5자 이상 써 주세요.'; end if;
  if char_length(v_body) > 2000 then raise exception '후기는 2,000자까지입니다.'; end if;

  select i.id, i.product_id, i.qty, i.cancelled_qty, o.store_id, o.user_id, o.status
    into v_item
    from public.mall_builder_order_items i join public.mall_builder_orders o on o.id = i.order_id
   where i.id = p_order_item_id;
  if v_item.id is null or v_item.user_id <> v_uid then raise exception '후기를 쓸 수 있는 주문 상품이 아닙니다.'; end if;
  if v_item.status not in ('delivered', 'confirmed') then raise exception '배송 완료된 상품만 후기를 쓸 수 있습니다.'; end if;
  if v_item.product_id is null then raise exception '지금은 판매하지 않는 상품이라 후기를 쓸 수 없습니다.'; end if;
  if v_item.qty - v_item.cancelled_qty <= 0 then raise exception '취소된 상품은 후기를 쓸 수 없습니다.'; end if;
  select c.id into v_customer from public.mall_builder_store_customers c where c.store_id = v_item.store_id and c.user_id = v_uid;
  if v_customer is null then raise exception '이 몰에 가입한 손님만 후기를 쓸 수 있습니다.'; end if;

  insert into public.mall_builder_reviews (store_id, product_id, order_item_id, user_id, customer_id, rating, body)
  values (v_item.store_id, v_item.product_id, v_item.id, v_uid, v_customer, p_rating, v_body)
  on conflict (order_item_id) do update
     set rating = excluded.rating, body = excluded.body, is_deleted = false, updated_at = now()
   where public.mall_builder_reviews.user_id = v_uid
  returning id into v_id;
  if v_id is null then raise exception '후기를 고칠 수 없습니다.'; end if;
  return v_id;
end;
$$;

-- 후기 지우기(본인) — 표시 칸만 바꾼다
create or replace function public.mall_builder_review_remove(p_review_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  update public.mall_builder_reviews set is_deleted = true, updated_at = now()
   where id = p_review_id and user_id = auth.uid();
  if not found then raise exception '지울 수 있는 후기가 아닙니다.'; end if;
end;
$$;

-- 운영자: 답글(빈 글이면 답글 지움)·숨기기
create or replace function public.mall_builder_review_moderate(p_review_id uuid, p_reply text, p_hidden boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_store uuid;
  v_reply text := nullif(btrim(coalesce(p_reply, '')), '');
begin
  select store_id into v_store from public.mall_builder_reviews where id = p_review_id;
  if v_store is null or not public.mall_builder_is_store_staff(v_store) then raise exception '이 후기를 처리할 권한이 없습니다.'; end if;
  if char_length(coalesce(v_reply, '')) > 2000 then raise exception '답글은 2,000자까지입니다.'; end if;
  update public.mall_builder_reviews r set
    reply = v_reply,
    replied_at = case when v_reply is null then null when r.reply is distinct from v_reply then now() else r.replied_at end,
    is_hidden = coalesce(p_hidden, r.is_hidden),
    updated_at = now()
  where r.id = p_review_id;
end;
$$;

-- 손님에게 보이는 상품 후기(숨김·지움 제외, 이름 가림) + 평균 별점
create or replace function public.mall_builder_product_reviews(p_product_id uuid, p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_store uuid;
  v_ok boolean;
  v_result jsonb;
begin
  select p.store_id, (s.status = 'active' and p.status in ('on_sale', 'sold_out')) or public.mall_builder_is_store_staff(p.store_id)
    into v_store, v_ok
    from public.mall_builder_products p join public.mall_builder_stores s on s.id = p.store_id
   where p.id = p_product_id;
  if v_store is null or not v_ok then return jsonb_build_object('count', 0, 'average', null, 'items', '[]'::jsonb); end if;

  select jsonb_build_object(
    'count', (select count(*) from public.mall_builder_reviews r where r.product_id = p_product_id and not r.is_hidden and not r.is_deleted),
    'average', (select round(avg(r.rating)::numeric, 1) from public.mall_builder_reviews r where r.product_id = p_product_id and not r.is_hidden and not r.is_deleted),
    'items', coalesce((
      select jsonb_agg(x order by x.created_at desc) from (
        select r.id, r.rating, r.body, r.reply, r.replied_at, r.created_at,
               public.mall_builder_mask_name(c.name) as author,
               i.option_snapshot as option,
               r.user_id = auth.uid() as mine
          from public.mall_builder_reviews r
          join public.mall_builder_store_customers c on c.id = r.customer_id
          join public.mall_builder_order_items i on i.id = r.order_item_id
         where r.product_id = p_product_id and not r.is_hidden and not r.is_deleted
         order by r.created_at desc
         limit greatest(1, least(coalesce(p_limit, 50), 200))
      ) x), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

-- 문의 쓰기: 상품 문의(product, 비밀글 선택) / 1:1 문의(personal, 늘 비밀). 하루 20개까지
create or replace function public.mall_builder_inquiry_write(
  p_store_id uuid, p_kind text, p_product_id uuid, p_order_id uuid, p_title text, p_body text, p_secret boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_customer uuid;
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_id uuid;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  if p_kind not in ('product', 'personal') then raise exception '문의 종류가 올바르지 않습니다.'; end if;
  if not exists (select 1 from public.mall_builder_stores s where s.id = p_store_id and s.status = 'active') then raise exception '문의를 받을 수 없는 몰입니다.'; end if;
  select c.id into v_customer from public.mall_builder_store_customers c where c.store_id = p_store_id and c.user_id = v_uid;
  if v_customer is null then raise exception '이 몰에 가입한 손님만 문의할 수 있습니다.'; end if;
  if v_title = '' then raise exception '문의 제목을 넣어 주세요.'; end if;
  if char_length(v_title) > 100 then raise exception '제목은 100자까지입니다.'; end if;
  if v_body = '' then raise exception '문의 내용을 넣어 주세요.'; end if;
  if char_length(v_body) > 2000 then raise exception '문의 내용은 2,000자까지입니다.'; end if;
  if p_kind = 'product' then
    if p_product_id is null or not exists (
      select 1 from public.mall_builder_products p where p.id = p_product_id and p.store_id = p_store_id and p.status in ('on_sale', 'sold_out')
    ) then raise exception '문의할 상품을 찾을 수 없습니다.'; end if;
  end if;
  if p_order_id is not null and not exists (
    select 1 from public.mall_builder_orders o where o.id = p_order_id and o.store_id = p_store_id and o.user_id = v_uid
  ) then raise exception '내 주문만 고를 수 있습니다.'; end if;
  if (select count(*) from public.mall_builder_inquiries q
       where q.store_id = p_store_id and q.user_id = v_uid and q.created_at > now() - interval '1 day') >= 20 then
    raise exception '문의는 하루 20개까지 남길 수 있습니다.';
  end if;

  insert into public.mall_builder_inquiries (store_id, kind, product_id, order_id, user_id, customer_id, title, body, is_secret)
  values (p_store_id, p_kind, case when p_kind = 'product' then p_product_id end, p_order_id, v_uid, v_customer, v_title, v_body,
          case when p_kind = 'personal' then true else coalesce(p_secret, false) end)
  returning id into v_id;
  return v_id;
end;
$$;

-- 문의 고치기(본인, 답변 전만)
create or replace function public.mall_builder_inquiry_edit(p_inquiry_id uuid, p_title text, p_body text, p_secret boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_q record;
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select id, kind, answer, is_deleted into v_q from public.mall_builder_inquiries where id = p_inquiry_id and user_id = auth.uid();
  if v_q.id is null or v_q.is_deleted then raise exception '고칠 수 있는 문의가 아닙니다.'; end if;
  if v_q.answer is not null then raise exception '답변이 달린 문의는 고칠 수 없습니다.'; end if;
  if v_title = '' or char_length(v_title) > 100 then raise exception '제목은 1~100자로 넣어 주세요.'; end if;
  if v_body = '' or char_length(v_body) > 2000 then raise exception '문의 내용은 1~2,000자로 넣어 주세요.'; end if;
  update public.mall_builder_inquiries set title = v_title, body = v_body,
    is_secret = case when v_q.kind = 'personal' then true else coalesce(p_secret, is_secret) end, updated_at = now()
  where id = p_inquiry_id;
end;
$$;

-- 문의 지우기(본인) — 표시 칸만 바꾼다
create or replace function public.mall_builder_inquiry_remove(p_inquiry_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  update public.mall_builder_inquiries set is_deleted = true, updated_at = now()
   where id = p_inquiry_id and user_id = auth.uid();
  if not found then raise exception '지울 수 있는 문의가 아닙니다.'; end if;
end;
$$;

-- 운영자: 답변(빈 글이면 답변 지움)·숨기기
create or replace function public.mall_builder_inquiry_answer(p_inquiry_id uuid, p_answer text, p_hidden boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_store uuid;
  v_answer text := nullif(btrim(coalesce(p_answer, '')), '');
begin
  select store_id into v_store from public.mall_builder_inquiries where id = p_inquiry_id;
  if v_store is null or not public.mall_builder_is_store_staff(v_store) then raise exception '이 문의를 처리할 권한이 없습니다.'; end if;
  if char_length(coalesce(v_answer, '')) > 3000 then raise exception '답변은 3,000자까지입니다.'; end if;
  update public.mall_builder_inquiries q set
    answer = v_answer,
    answered_at = case when v_answer is null then null when q.answer is distinct from v_answer then now() else q.answered_at end,
    is_hidden = coalesce(p_hidden, q.is_hidden),
    updated_at = now()
  where q.id = p_inquiry_id;
end;
$$;

-- 손님에게 보이는 상품 문의(숨김·지움 제외). 비밀글은 본인·운영자만 내용·답변이 보인다
create or replace function public.mall_builder_product_inquiries(p_product_id uuid, p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_store uuid;
  v_ok boolean;
  v_staff boolean;
  v_result jsonb;
begin
  select p.store_id, (s.status = 'active' and p.status in ('on_sale', 'sold_out')) or public.mall_builder_is_store_staff(p.store_id)
    into v_store, v_ok
    from public.mall_builder_products p join public.mall_builder_stores s on s.id = p.store_id
   where p.id = p_product_id;
  if v_store is null or not v_ok then return jsonb_build_object('count', 0, 'items', '[]'::jsonb); end if;
  v_staff := public.mall_builder_is_store_staff(v_store);

  select jsonb_build_object(
    'count', (select count(*) from public.mall_builder_inquiries q where q.product_id = p_product_id and q.kind = 'product' and not q.is_hidden and not q.is_deleted),
    'items', coalesce((
      select jsonb_agg(x order by x.created_at desc) from (
        select q.id, q.is_secret, q.created_at, q.answered_at,
               q.answer is not null as answered,
               (q.user_id = auth.uid()) as mine,
               case when not q.is_secret or q.user_id = auth.uid() or v_staff then q.title else '비밀글입니다.' end as title,
               case when not q.is_secret or q.user_id = auth.uid() or v_staff then q.body end as body,
               case when not q.is_secret or q.user_id = auth.uid() or v_staff then q.answer end as answer,
               public.mall_builder_mask_name(c.name) as author
          from public.mall_builder_inquiries q
          join public.mall_builder_store_customers c on c.id = q.customer_id
         where q.product_id = p_product_id and q.kind = 'product' and not q.is_hidden and not q.is_deleted
         order by q.created_at desc
         limit greatest(1, least(coalesce(p_limit, 50), 200))
      ) x), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
