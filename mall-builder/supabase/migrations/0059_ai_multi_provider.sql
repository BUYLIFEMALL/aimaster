-- 2026-11-12 AI 도우미 제공자·모델 선택(OpenAI / Claude / Gemini) — 플랜 docs/PLAN_20261112_AI_MULTI_PROVIDER.md
-- 추가 위주: 칸 2개 추가, 모델 허용 목록 넓힘(옛 검사 규칙을 새 규칙으로 바꿈), 함수 2개 추가·상태 함수 교체. 지워지는 데이터는 없다.
-- 모델 목록은 src/lib/aiQuote.ts의 AI_MODELS와 같게 유지한다.

alter table public.mall_builder_store_scheduler_secrets add column if not exists ai_provider text not null default 'anthropic';
alter table public.mall_builder_store_scheduler_secrets add column if not exists ai_key_provider text not null default 'anthropic';

do $$
declare c record;
begin
  -- 옛 모델 검사(Claude 3종만)를 찾아 새 목록 검사로 바꾼다
  for c in select conname from pg_constraint
           where conrelid = 'public.mall_builder_store_scheduler_secrets'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) like '%ai_model%' and conname <> 'mall_builder_secrets_ai_model_v2'
  loop
    execute format('alter table public.mall_builder_store_scheduler_secrets drop constraint %I', c.conname);
  end loop;
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_secrets_ai_model_v2') then
    alter table public.mall_builder_store_scheduler_secrets add constraint mall_builder_secrets_ai_model_v2 check (ai_model in (
      'gpt-6-luna', 'gpt-6.1-terra', 'gpt-6.1-sol', 'gpt-6-astra',
      'claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5',
      'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-4-argon'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_secrets_ai_provider') then
    alter table public.mall_builder_store_scheduler_secrets add constraint mall_builder_secrets_ai_provider
      check (ai_provider in ('openai', 'anthropic', 'gemini') and ai_key_provider in ('openai', 'anthropic', 'gemini'));
  end if;
end $$;

create or replace function mall_builder_private.ai_model_provider(p_model text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_model in ('gpt-6-luna', 'gpt-6.1-terra', 'gpt-6.1-sol', 'gpt-6-astra') then 'openai'
    when p_model in ('claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5') then 'anthropic'
    when p_model in ('gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-4-argon') then 'gemini'
  end
$$;

-- 설정 저장(제공자 포함) — 대표만. p_key_enc가 null이면 키는 그대로, p_clear_key면 지움. 새 키는 p_provider 것으로 기록
create or replace function public.mall_builder_ai_settings_save2(
  p_store_id uuid, p_provider text, p_model text, p_min_margin integer,
  p_key_enc text default null, p_key_hint text default null, p_clear_key boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.mall_builder_is_store_owner(p_store_id) then raise exception '몰 대표만 AI 설정을 바꿀 수 있습니다.'; end if;
  if p_provider not in ('openai', 'anthropic', 'gemini') then raise exception 'AI 제공자를 골라 주세요.'; end if;
  if mall_builder_private.ai_model_provider(p_model) is distinct from p_provider then raise exception '모델을 골라 주세요.'; end if;
  if p_min_margin is null or p_min_margin < 0 or p_min_margin > 90 then raise exception '최소 마진율은 0~90%%로 입력해 주세요.'; end if;
  if p_key_enc is not null and (p_key_enc !~ '^v1:[A-Za-z0-9+/=]+$' or length(p_key_enc) not between 40 and 2000) then raise exception '키를 저장하지 못했습니다(암호화 형식 오류).'; end if;
  insert into public.mall_builder_store_scheduler_secrets (store_id, ai_provider, ai_model, ai_min_margin, ai_key_enc, ai_key_hint, ai_key_provider)
  values (p_store_id, p_provider, p_model, p_min_margin, coalesce(p_key_enc, ''), coalesce(left(p_key_hint, 8), ''), p_provider)
  on conflict (store_id) do update set
    ai_provider = excluded.ai_provider,
    ai_model = excluded.ai_model,
    ai_min_margin = excluded.ai_min_margin,
    ai_key_enc = case when p_clear_key then '' when p_key_enc is not null then excluded.ai_key_enc else public.mall_builder_store_scheduler_secrets.ai_key_enc end,
    ai_key_hint = case when p_clear_key then '' when p_key_enc is not null then excluded.ai_key_hint else public.mall_builder_store_scheduler_secrets.ai_key_hint end,
    ai_key_provider = case when p_key_enc is not null then p_provider else public.mall_builder_store_scheduler_secrets.ai_key_provider end,
    updated_at = now();
end $$;

-- 상태 보기 — 그 몰 직원 누구나(키 자체는 없음, 끝 4자리만). provider·key_provider 추가
create or replace function public.mall_builder_ai_status(p_store_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.mall_builder_is_store_staff(p_store_id) then
    coalesce((select jsonb_build_object('has_key', s.ai_key_enc <> '', 'hint', s.ai_key_hint, 'model', s.ai_model, 'min_margin', s.ai_min_margin,
                                        'provider', s.ai_provider, 'key_provider', s.ai_key_provider)
                from public.mall_builder_store_scheduler_secrets s where s.store_id = p_store_id),
             jsonb_build_object('has_key', false, 'hint', '', 'model', 'claude-sonnet-5-5', 'min_margin', 10, 'provider', 'anthropic', 'key_provider', 'anthropic'))
  end
$$;

-- AI 도우미를 쓸 수 있는 직원인지(운영에서 몰 대표의 메인 사이트 키를 서버가 읽기 전에 확인) — 0049의 키 꺼내기와 같은 메뉴 권한
create or replace function public.mall_builder_ai_can_use(p_store_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.mall_builder_staff_can(p_store_id, 'orders')
               or public.mall_builder_staff_can(p_store_id, 'products')
               or public.mall_builder_staff_can(p_store_id, 'boards')
               or public.mall_builder_staff_can(p_store_id, 'home'), false)
$$;

revoke all on function public.mall_builder_ai_settings_save2(uuid, text, text, integer, text, text, boolean) from public, anon;
grant execute on function public.mall_builder_ai_settings_save2(uuid, text, text, integer, text, text, boolean) to authenticated;
revoke all on function public.mall_builder_ai_can_use(uuid) from public, anon;
grant execute on function public.mall_builder_ai_can_use(uuid) to authenticated;
