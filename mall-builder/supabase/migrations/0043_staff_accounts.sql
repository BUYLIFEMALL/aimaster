-- AI 쇼핑몰 빌더 D22 — 직원 부계정(초대·메뉴 묶음 권한·접속 기록) (플랜 docs/PLAN_20261109_STAFF_ACCOUNTS.md)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만(지우기·권한 회수·규칙 삭제 없음 — 함수는 create or replace, 직원 내보내기는 removed_at 표시).
-- 결정(주인님 2026-11-09): 메뉴 묶음 6개(orders·products·customers·boards·home·stats) + 설정·직원 관리는 대표만 ·
--   화면은 묶음별로, DB는 돈·비밀값·사람이 걸린 함수만 권한 검사 · 초대 링크 + 이메일 일치 · 접속 기록 1년·대표만 열람.

-- ── 0043a 칸·표 ──
alter table public.mall_builder_store_staff add column if not exists perms jsonb not null default '{}'::jsonb;
alter table public.mall_builder_store_staff add column if not exists removed_at timestamptz;
alter table public.mall_builder_store_staff add column if not exists invited_by uuid;

create table if not exists public.mall_builder_staff_invites (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  email text not null check (char_length(email) between 3 and 120),
  perms jsonb not null default '{}'::jsonb,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid,
  revoked_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
alter table public.mall_builder_staff_invites enable row level security;  -- 규칙 0개: 함수로만

-- 접속 기록(개인정보 화면 열람·직원 변경) — 법정 보관 기록이라 생성 데이터 30일 자동 삭제 대상 아님(1년 이상 보관)
create table if not exists public.mall_builder_staff_access_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  user_id uuid,
  action text not null check (char_length(action) between 1 and 40),
  target_type text not null default '' check (char_length(target_type) <= 40),
  target_id text not null default '' check (char_length(target_id) <= 80),
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists mall_builder_staff_access_logs_store on public.mall_builder_staff_access_logs (store_id, created_at desc);
alter table public.mall_builder_staff_access_logs enable row level security;

-- ── 0043b 판단 함수 ──
-- 운영자인가(내보낸 직원 제외)
create or replace function public.mall_builder_is_store_staff(p_store_id uuid)
returns boolean language sql stable security definer set search_path to '' as $function$
  select exists (
    select 1 from public.mall_builder_store_staff s
    where s.store_id = p_store_id and s.user_id = auth.uid() and s.removed_at is null
  );
$function$;

create or replace function public.mall_builder_is_store_owner(p_store_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.mall_builder_store_staff s
                  where s.store_id = p_store_id and s.user_id = auth.uid() and s.removed_at is null and s.role = 'owner')
$$;

-- 이 권한이 있는가: 대표는 언제나, 직원은 perms에 켠 묶음만. 'owner'는 대표만
create or replace function public.mall_builder_staff_can(p_store_id uuid, p_perm text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.mall_builder_store_staff s
                  where s.store_id = p_store_id and s.user_id = auth.uid() and s.removed_at is null
                    and (s.role = 'owner' or (p_perm <> 'owner' and coalesce((s.perms ->> p_perm)::boolean, false))))
$$;

create policy mall_builder_staff_access_logs_read on public.mall_builder_staff_access_logs for select using (public.mall_builder_is_store_owner(store_id));

-- 몰 설정 표(이름·사업자 정보·설정 json)는 대표만 고친다(직원은 보안 규칙상 고칠 수 있었음 → 트리거로 막음)
create or replace function public.mall_builder_stores_owner_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and not public.mall_builder_is_store_owner(old.id) then
    raise exception '쇼핑몰 설정은 대표 운영자만 바꿀 수 있습니다.';
  end if;
  return new;
end;
$$;
create trigger mall_builder_stores_owner_guard before update on public.mall_builder_stores
  for each row execute function public.mall_builder_stores_owner_guard();

-- ── 0043c 직원 함수 ──
create or replace function mall_builder_private.clean_perms(p jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'orders', coalesce((p ->> 'orders')::boolean, false), 'products', coalesce((p ->> 'products')::boolean, false),
    'customers', coalesce((p ->> 'customers')::boolean, false), 'boards', coalesce((p ->> 'boards')::boolean, false),
    'home', coalesce((p ->> 'home')::boolean, false), 'stats', coalesce((p ->> 'stats')::boolean, false))
$$;

create or replace function mall_builder_private.staff_log(p_store uuid, p_action text, p_type text, p_target text, p_note text)
returns void language sql security definer set search_path = '' as $$
  insert into public.mall_builder_staff_access_logs (store_id, user_id, action, target_type, target_id, note)
  values (p_store, auth.uid(), p_action, coalesce(p_type, ''), left(coalesce(p_target, ''), 80), left(coalesce(p_note, ''), 200))
$$;

-- 대표: 초대 링크 만들기(7일·1회용). 돌려주는 토큰은 이때 한 번만 보이고 DB에는 해시만
create or replace function public.mall_builder_staff_invite(p_store_id uuid, p_email text, p_perms jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_exp timestamptz := now() + interval '7 days';
begin
  if auth.uid() is null or not public.mall_builder_is_store_owner(p_store_id) then raise exception '직원 초대는 대표 운영자만 할 수 있습니다.'; end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(v_email) > 120 then raise exception '직원 이메일을 확인해 주세요.'; end if;
  if exists (select 1 from public.mall_builder_store_staff s join auth.users u on u.id = s.user_id
              where s.store_id = p_store_id and s.removed_at is null and lower(u.email) = v_email) then
    raise exception '이미 이 몰의 운영자인 이메일입니다.';
  end if;
  insert into public.mall_builder_staff_invites (store_id, email, perms, token_hash, expires_at, created_by)
  values (p_store_id, v_email, mall_builder_private.clean_perms(p_perms), encode(extensions.digest(v_token, 'sha256'), 'hex'), v_exp, auth.uid());
  perform mall_builder_private.staff_log(p_store_id, 'staff_invite', 'email', v_email, mall_builder_private.clean_perms(p_perms)::text);
  return jsonb_build_object('token', v_token, 'expires_at', v_exp);
end;
$$;

-- 초대 수락: 로그인한 이메일이 초대 이메일과 같아야. 내보냈던 직원이면 다시 들어옴
create or replace function public.mall_builder_staff_accept(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  i public.mall_builder_staff_invites%rowtype;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_slug text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into i from public.mall_builder_staff_invites x
   where x.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex') for update;
  if i.id is null or i.revoked_at is not null then raise exception '쓸 수 없는 초대 링크입니다.'; end if;
  if i.accepted_at is not null then raise exception '이미 사용한 초대 링크입니다.'; end if;
  if i.expires_at <= now() then raise exception '초대 링크 기간(7일)이 지났습니다. 대표 운영자에게 다시 요청해 주세요.'; end if;
  if v_email <> i.email then raise exception '초대받은 이메일(%)로 로그인해 주세요.', left(i.email, 2) || '***@' || split_part(i.email, '@', 2); end if;  -- 0043e: 다른 사람에게 전체 이메일이 보이지 않게
  if exists (select 1 from public.mall_builder_store_staff s where s.store_id = i.store_id and s.user_id = auth.uid() and s.role = 'owner') then
    raise exception '이미 이 몰의 대표 운영자입니다.';
  end if;
  insert into public.mall_builder_store_staff (store_id, user_id, role, perms, invited_by)
  values (i.store_id, auth.uid(), 'staff', i.perms, i.created_by)
  on conflict (store_id, user_id) do update set role = 'staff', perms = excluded.perms, removed_at = null, invited_by = excluded.invited_by;
  update public.mall_builder_staff_invites set accepted_at = now(), accepted_by = auth.uid() where id = i.id;
  perform mall_builder_private.staff_log(i.store_id, 'staff_accept', 'email', i.email, '');
  select s.slug into v_slug from public.mall_builder_stores s where s.id = i.store_id;
  return jsonb_build_object('slug', v_slug);
end;
$$;

-- 대표: 직원 권한 바꾸기 · 내보내기(지우지 않고 표시) · 초대 거두기
create or replace function public.mall_builder_staff_update(p_store_id uuid, p_user_id uuid, p_perms jsonb, p_remove boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.mall_builder_store_staff%rowtype;
begin
  if auth.uid() is null or not public.mall_builder_is_store_owner(p_store_id) then raise exception '직원 관리는 대표 운영자만 할 수 있습니다.'; end if;
  select * into s from public.mall_builder_store_staff x where x.store_id = p_store_id and x.user_id = p_user_id for update;
  if s.user_id is null then raise exception '직원을 찾을 수 없습니다.'; end if;
  if s.role = 'owner' then raise exception '대표 운영자의 권한은 바꿀 수 없습니다.'; end if;
  if p_remove then
    update public.mall_builder_store_staff set removed_at = now() where store_id = p_store_id and user_id = p_user_id;
    perform mall_builder_private.staff_log(p_store_id, 'staff_remove', 'user', p_user_id::text, '');
  else
    update public.mall_builder_store_staff set perms = mall_builder_private.clean_perms(p_perms) where store_id = p_store_id and user_id = p_user_id;
    perform mall_builder_private.staff_log(p_store_id, 'staff_perms', 'user', p_user_id::text, mall_builder_private.clean_perms(p_perms)::text);
  end if;
end;
$$;

create or replace function public.mall_builder_staff_revoke_invite(p_invite_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare i public.mall_builder_staff_invites%rowtype;
begin
  select * into i from public.mall_builder_staff_invites where id = p_invite_id for update;
  if i.id is null or auth.uid() is null or not public.mall_builder_is_store_owner(i.store_id) then raise exception '직원 관리는 대표 운영자만 할 수 있습니다.'; end if;
  update public.mall_builder_staff_invites set revoked_at = now() where id = i.id and accepted_at is null;
  perform mall_builder_private.staff_log(i.store_id, 'staff_invite_revoke', 'email', i.email, '');
end;
$$;

-- 대표: 직원·초대 목록(이메일 포함)
create or replace function public.mall_builder_staff_list(p_store_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.mall_builder_is_store_owner(p_store_id) then raise exception '직원 관리는 대표 운영자만 할 수 있습니다.'; end if;
  return jsonb_build_object(
    'staff', coalesce((select jsonb_agg(jsonb_build_object('user_id', s.user_id, 'email', u.email, 'role', s.role, 'perms', s.perms, 'created_at', s.created_at, 'removed_at', s.removed_at) order by s.created_at)
                         from public.mall_builder_store_staff s join auth.users u on u.id = s.user_id where s.store_id = p_store_id), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'email', i.email, 'perms', i.perms, 'expires_at', i.expires_at, 'created_at', i.created_at) order by i.created_at desc)
                           from public.mall_builder_staff_invites i where i.store_id = p_store_id and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()), '[]'::jsonb));
end;
$$;

-- 내 권한(관리 화면 메뉴 거르기용)
create or replace function public.mall_builder_my_staff(p_store_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('role', s.role, 'perms', s.perms) from public.mall_builder_store_staff s
   where s.store_id = p_store_id and s.user_id = auth.uid() and s.removed_at is null
$$;

-- 운영자: 개인정보 화면 열람 기록(손님 상세·주문 상세)
create or replace function public.mall_builder_staff_log_view(p_store_id uuid, p_type text, p_target text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.mall_builder_is_store_staff(p_store_id) then return; end if;
  if p_type not in ('customer', 'order') then return; end if;
  perform mall_builder_private.staff_log(p_store_id, 'view_' || p_type, p_type, p_target, '');
end;
$$;

-- ── 0043d 민감 함수에 권한 검사(함수 본문의 「운영자인가」를 「이 권한이 있는가」로 바꿔 다시 만듦) ──
do $do$
declare
  r record;
  d text;
  groups jsonb := '{
    "owner": ["mall_builder_auto_progress_save","mall_builder_closed_save","mall_builder_closed_status","mall_builder_email_credentials","mall_builder_email_log_test","mall_builder_email_save","mall_builder_notify_credentials","mall_builder_notify_log_test","mall_builder_notify_save","mall_builder_payment_save","mall_builder_payment_secret_status","mall_builder_restock_notify_save","mall_builder_scheduler_api_key","mall_builder_scheduler_link","mall_builder_scheduler_save","mall_builder_tax_key_status","mall_builder_tax_key_test","mall_builder_tax_settings_save"],
    "orders": ["mall_builder_cancel_order_items","mall_builder_card_cancel_items","mall_builder_card_cancel_order","mall_builder_card_recheck","mall_builder_card_refund_remaining","mall_builder_change_order_status","mall_builder_tax_invoice_issue","mall_builder_tax_invoice_amend","mall_builder_tax_invoice_recheck","mall_builder_tax_invoice_preview","mall_builder_mark_tax_invoice_issued","mall_builder_answer_quote","mall_builder_send_quote"],
    "customers": ["mall_builder_points_adjust","mall_builder_coupon_issue","mall_builder_member_review","mall_builder_review_business","mall_builder_set_credit_limit","mall_builder_credit_entry"],
    "products": ["mall_builder_group_buy_close","mall_builder_group_buy_cancel_all"]
  }';
  g text;
  fn text;
  n integer;
begin
  for g in select jsonb_object_keys(groups) loop
    for fn in select jsonb_array_elements_text(groups -> g) loop
      for r in select p.oid from pg_proc p where p.proname = fn and p.pronamespace = 'public'::regnamespace loop
        d := pg_get_functiondef(r.oid);
        n := (length(d) - length(replace(d, 'mall_builder_is_store_staff(', ''))) / length('mall_builder_is_store_staff(');
        if n = 0 then raise exception '%: 바꿀 자리가 없습니다.', fn; end if;
        d := regexp_replace(d, 'public\.mall_builder_is_store_staff\(([^()]*)\)', 'public.mall_builder_staff_can(\1, ''' || g || ''')', 'g');
        if position('mall_builder_is_store_staff(' in d) > 0 then raise exception '%: 다 바꾸지 못했습니다.', fn; end if;
        execute d;
      end loop;
    end loop;
  end loop;
end
$do$;
