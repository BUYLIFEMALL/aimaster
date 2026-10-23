-- crm-google-form 서브프로젝트: 구글폼에 새 응답이 들어오면 신청자에게 접수 확인
-- (이메일/SMS/카카오 알림톡/카카오 친구톡)을 자동 발송하고, 운영자 본인 텔레그램으로도
-- 신청 내역을 요약 전달하는 CRM 자동화. Phase 1 = 구글폼 연동 + 접수 내역 + 이메일(SMTP).
--
-- 구글폼 감지는 Google Forms API OAuth가 아니라 "사용자가 자기 구글시트에 Apps Script
-- 웹훅을 붙이는" 방식을 쓴다 (설계 배경: docs/ARCHITECTURE.md §1) — 그래서 웹훅 인증은
-- crm_form_sources.webhook_token 매칭만으로 이뤄진다 (로그인 세션이 없는 진짜 외부 콜백).

-- 사용자가 연결한 구글폼(시트) 하나당 레코드 1개. webhook_token이 Apps Script가 호출하는
-- URL의 인증 수단이다.
create table public.crm_form_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,                    -- 사용자가 붙이는 폼 이름 (예: "수강상담 신청폼")
  webhook_token uuid not null default gen_random_uuid(),
  -- 표준 필드(name/phone/email) <- 구글폼 질문 "제목" 텍스트 매핑. 예: {"name": "성함", "phone": "연락처"}
  field_mapping jsonb not null default '{}'::jsonb,
  notify_email boolean not null default true,
  notify_telegram boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (webhook_token)
);

create index crm_form_sources_user_id_idx on public.crm_form_sources(user_id);

-- 구글폼 응답 1건 = 레코드 1개. raw_values는 Apps Script가 보낸 원본(질문제목 -> 답변)을
-- 그대로 보관해서, field_mapping이 나중에 바뀌어도 원본 데이터는 남는다.
create table public.crm_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  form_source_id uuid not null references public.crm_form_sources(id) on delete cascade,
  response_id text,                      -- 구글폼 응답 ID (Apps Script e.response.getId())
  raw_values jsonb not null default '{}'::jsonb,
  name text,
  phone text,
  email text,
  status text not null default 'received'
    check (status in ('received','notified','failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index crm_submissions_user_id_idx on public.crm_submissions(user_id);
create index crm_submissions_form_source_id_idx on public.crm_submissions(form_source_id);

-- 사용자가 등록하는 발송용 이메일 계정 (stepmail_smtp_accounts와 동일 구조 — 검증된 패턴 재사용).
create table public.crm_smtp_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  provider text,
  smtp_host text not null,
  smtp_port int not null default 587,
  smtp_user text not null,
  smtp_password text not null,
  from_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index crm_smtp_accounts_user_id_idx on public.crm_smtp_accounts(user_id);

-- updated_at 자동 갱신: AIMaster 공용 set_updated_at() 함수 재사용(이미 다른 서브프로젝트에서 생성됨).
create trigger crm_form_sources_set_updated_at
  before update on public.crm_form_sources
  for each row execute function public.set_updated_at();

create trigger crm_smtp_accounts_set_updated_at
  before update on public.crm_smtp_accounts
  for each row execute function public.set_updated_at();

-- RLS: 전부 owner-only. crm_submissions의 insert는 웹훅(로그인 세션 없음)이 admin
-- client(service role, RLS 우회)로 처리하므로 별도 insert 정책 없이도 동작하지만, 향후
-- 클라이언트에서 직접 insert할 일이 생길 걸 대비해 owner-only insert 정책도 걸어둔다.
alter table public.crm_form_sources enable row level security;
alter table public.crm_submissions enable row level security;
alter table public.crm_smtp_accounts enable row level security;

create policy "crm_form_sources_owner_select" on public.crm_form_sources for select using (auth.uid() = user_id);
create policy "crm_form_sources_owner_insert" on public.crm_form_sources for insert with check (auth.uid() = user_id);
create policy "crm_form_sources_owner_update" on public.crm_form_sources for update using (auth.uid() = user_id);
create policy "crm_form_sources_owner_delete" on public.crm_form_sources for delete using (auth.uid() = user_id);

create policy "crm_submissions_owner_select" on public.crm_submissions for select using (auth.uid() = user_id);
create policy "crm_submissions_owner_insert" on public.crm_submissions for insert with check (auth.uid() = user_id);
create policy "crm_submissions_owner_delete" on public.crm_submissions for delete using (auth.uid() = user_id);

create policy "crm_smtp_accounts_owner_select" on public.crm_smtp_accounts for select using (auth.uid() = user_id);
create policy "crm_smtp_accounts_owner_insert" on public.crm_smtp_accounts for insert with check (auth.uid() = user_id);
create policy "crm_smtp_accounts_owner_update" on public.crm_smtp_accounts for update using (auth.uid() = user_id);
create policy "crm_smtp_accounts_owner_delete" on public.crm_smtp_accounts for delete using (auth.uid() = user_id);
