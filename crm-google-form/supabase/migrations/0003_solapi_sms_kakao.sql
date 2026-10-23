-- SOLAPI 연동으로 SMS/카카오 알림톡/카카오 친구톡(현재는 SOLAPI가 브랜드 메시지로 자동
-- 대체 발송함, 2026-01-01부터 — 코드는 기존 CTA 방식 그대로 사용 가능) 발송을 추가한다.
--
-- SOLAPI 계정(apiKey/apiSecret/발신번호/카카오 채널)도 SMTP·텔레그램과 동일한 철학으로
-- 프로그램 접두어 없는 공용 테이블로 처음부터 설계한다 — 사용자 본인의 문자/카카오 발송
-- 계정은 프로그램마다 따로 등록할 이유가 없다(user_smtp_accounts를 나중에 승격했던 것과 같은
-- 실수를 반복하지 않기 위함).
create table public.user_solapi_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  api_key text not null,
  api_secret text not null,
  sender_phone text not null,   -- SOLAPI에 등록/인증된 발신번호
  kakao_pf_id text,             -- 카카오 비즈니스 채널 ID (알림톡/친구톡 쓸 때만 필요)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_solapi_accounts_set_updated_at
  before update on public.user_solapi_accounts
  for each row execute function public.set_updated_at();

alter table public.user_solapi_accounts enable row level security;
create policy "user_solapi_accounts_owner_select" on public.user_solapi_accounts for select using (auth.uid() = user_id);
create policy "user_solapi_accounts_owner_insert" on public.user_solapi_accounts for insert with check (auth.uid() = user_id);
create policy "user_solapi_accounts_owner_update" on public.user_solapi_accounts for update using (auth.uid() = user_id);
create policy "user_solapi_accounts_owner_delete" on public.user_solapi_accounts for delete using (auth.uid() = user_id);

-- 폼 소스별로 SMS/알림톡/친구톡 발송 여부와, 알림톡에 필요한 템플릿ID·변수 매핑을 추가한다.
-- 알림톡 변수 매핑은 field_mapping과 같은 개념이지만 키가 "#{변수명}"(카카오 템플릿 형식)이라
-- 별도 컬럼으로 분리했다. 예: {"#{성함}": "성함", "#{연락처}": "연락처"}
-- (오른쪽 값은 field_mapping과 마찬가지로 "구글폼 질문 제목"을 가리킨다.)
alter table public.crm_form_sources add column notify_sms boolean not null default false;
alter table public.crm_form_sources add column notify_alimtalk boolean not null default false;
alter table public.crm_form_sources add column notify_friendtalk boolean not null default false;
alter table public.crm_form_sources add column kakao_template_id text;
alter table public.crm_form_sources add column kakao_variables jsonb not null default '{}'::jsonb;
