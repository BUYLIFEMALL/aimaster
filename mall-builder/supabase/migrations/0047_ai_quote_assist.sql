-- D27 AI 견적 보조(2026-11-11, 주인님 결정: 키는 「암호화+서버 호출」, 모델 3개 중 선택·최소 마진율·원가 보냄)
-- 추가만 한다. 지금 지워지는 데이터는 없다.
-- 몰 대표 본인 Anthropic 키는 서버(Lab 환경변수 MALL_SECRET_KEY)로 암호화한 글자로만 DB에 둔다. DB·브라우저는 원래 키를 모른다.
-- 비밀 표(mall_builder_store_scheduler_secrets)는 보안 규칙이 0개라 함수로만 읽고 쓴다.

alter table public.mall_builder_store_scheduler_secrets add column if not exists ai_key_enc text not null default '';
alter table public.mall_builder_store_scheduler_secrets add column if not exists ai_key_hint text not null default '';
alter table public.mall_builder_store_scheduler_secrets add column if not exists ai_model text not null default 'claude-sonnet-5-5'
  check (ai_model in ('claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'));
alter table public.mall_builder_store_scheduler_secrets add column if not exists ai_min_margin integer not null default 10
  check (ai_min_margin between 0 and 90);

-- 견적에 마지막 AI 제안(제안 단가·이유·모델·토큰·대략 비용) 기록
alter table public.mall_builder_quotes add column if not exists ai_suggestion jsonb;

-- 설정 저장 — 대표만. p_key_enc가 null이면 키는 그대로, p_clear_key면 지움
create or replace function public.mall_builder_ai_settings_save(
  p_store_id uuid, p_model text, p_min_margin integer, p_key_enc text default null, p_key_hint text default null, p_clear_key boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.mall_builder_is_store_owner(p_store_id) then raise exception '몰 대표만 AI 설정을 바꿀 수 있습니다.'; end if;
  if p_model not in ('claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5') then raise exception '모델을 골라 주세요.'; end if;
  if p_min_margin is null or p_min_margin < 0 or p_min_margin > 90 then raise exception '최소 마진율은 0~90%%로 입력해 주세요.'; end if;
  if p_key_enc is not null and (p_key_enc !~ '^v1:[A-Za-z0-9+/=]+$' or length(p_key_enc) not between 40 and 2000) then raise exception '키를 저장하지 못했습니다(암호화 형식 오류).'; end if;
  insert into public.mall_builder_store_scheduler_secrets (store_id, ai_model, ai_min_margin, ai_key_enc, ai_key_hint)
  values (p_store_id, p_model, p_min_margin, coalesce(p_key_enc, ''), coalesce(left(p_key_hint, 8), ''))
  on conflict (store_id) do update set
    ai_model = excluded.ai_model,
    ai_min_margin = excluded.ai_min_margin,
    ai_key_enc = case when p_clear_key then '' when p_key_enc is not null then excluded.ai_key_enc else public.mall_builder_store_scheduler_secrets.ai_key_enc end,
    ai_key_hint = case when p_clear_key then '' when p_key_enc is not null then excluded.ai_key_hint else public.mall_builder_store_scheduler_secrets.ai_key_hint end,
    updated_at = now();
end $$;

-- 상태 보기 — 그 몰 직원 누구나(키 자체는 없음, 끝 4자리만)
create or replace function public.mall_builder_ai_status(p_store_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.mall_builder_is_store_staff(p_store_id) then
    coalesce((select jsonb_build_object('has_key', s.ai_key_enc <> '', 'hint', s.ai_key_hint, 'model', s.ai_model, 'min_margin', s.ai_min_margin)
                from public.mall_builder_store_scheduler_secrets s where s.store_id = p_store_id),
             jsonb_build_object('has_key', false, 'hint', '', 'model', 'claude-sonnet-5-5', 'min_margin', 10))
  end
$$;

-- 암호문 꺼내기 — 「주문」 권한 직원만(견적 메뉴). 원래 키가 아니라 서버만 풀 수 있는 암호문
create or replace function public.mall_builder_ai_key_enc(p_store_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case when public.mall_builder_staff_can(p_store_id, 'orders') then
    (select nullif(s.ai_key_enc, '') from public.mall_builder_store_scheduler_secrets s where s.store_id = p_store_id)
  end
$$;

-- AI 제안 기록 — 「주문」 권한 직원만, 그 몰 견적만
create or replace function public.mall_builder_ai_quote_log(p_quote_id uuid, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_store uuid;
begin
  select q.store_id into v_store from public.mall_builder_quotes q where q.id = p_quote_id;
  if v_store is null or not public.mall_builder_staff_can(v_store, 'orders') then raise exception '이 견적을 다룰 권한이 없습니다.'; end if;
  if jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 20000 then raise exception '기록 형식이 맞지 않습니다.'; end if;
  update public.mall_builder_quotes set ai_suggestion = p_payload || jsonb_build_object('at', now()) where id = p_quote_id;
end $$;
