-- stepmail 서브프로젝트: 리드(잠재고객) 관리 + 사용자별 SMTP 계정 여러 개 등록 + AI로 작성한
-- 이메일을 예약(수량/시간대/반복주기)에 따라 자동 발송하는 프로그램.
--
-- 원래 D:\PDS\의 Make.com 시나리오(구글시트 CRM + Naver 1차/Gmail 2차 콜드메일)를 참고했지만,
-- 실제 요구사항은 그보다 넓다 — 임의 개수의 SMTP 계정(구글/네이버/다음 등)을 등록해두고,
-- 원하는 수량/시간대/반복주기로 예약 발송하며, 이메일 본문 자체도 blog의 AI 글쓰기 폼과
-- 동일한 방식(주제/키워드/참고문서/추천링크 입력 -> AI 초안 생성 -> 사용자 검토/수정 후 저장)
-- 으로 만든다. Make.com 원본의 "F/G/H가 전부 비어있어야 트리거"라는 필터 버그(실제 잠재고객
-- 시트를 확인해보니 1년 넘게 2차 메일이 단 한 번도 안 나간 상태였다, 2026-08-17)는 재현하지
-- 않고 명확한 status 상태값으로 재설계했다.

-- 리드(잠재고객). 엑셀 업로드로 채워진다 — 원본 시트 컬럼(입력일/채널/닉네임/이메일/메모/
-- 현재Funnel/콜드메일차수/마지막발송일)을 그대로 반영하되, Funnel/차수를 하나의 status로 통합.
create table public.stepmail_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_date date,              -- 원본 시트 "입력일"(리드 최초 등록일). 없으면 null.
  channel text,                 -- 원본 시트 "채널" (예: "T"=Threads). 자유 텍스트.
  nickname text,                -- 원본 시트 "닉네임"
  email text not null,
  memo text,
  -- new: 미접촉 / step1_sent: 1차 발송 완료 / step2_sent: 2차(이후) 발송 완료 /
  -- customer_completed: 전환된 고객(발송 대상 제외) / stopped: 수신거부(발송 대상 제외)
  status text not null default 'new'
    check (status in ('new','step1_sent','step2_sent','customer_completed','stopped')),
  step1_sent_at timestamptz,
  step2_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, email)
);

create index stepmail_leads_user_id_idx on public.stepmail_leads(user_id);
create index stepmail_leads_user_status_idx on public.stepmail_leads(user_id, status);

-- 사용자가 등록하는 발송용 이메일 계정(구글/네이버/다음 등, 개수 제한 없음). SMTP 프로토콜로
-- 통일한다 — Gmail도 OAuth 대신 앱 비밀번호로 붙이면 이미 검증된 네이버 SMTP 패턴
-- (docs/PLATFORM_PATTERNS.md)과 동일하게 다룰 수 있어 훨씬 단순하고 안정적이다.
create table public.stepmail_smtp_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,          -- 사용자가 붙이는 별칭 (예: "네이버 메인")
  provider text,                -- 참고용 자유 텍스트 (예: "gmail"/"naver"/"daum"/"other")
  smtp_host text not null,
  smtp_port int not null default 587,
  smtp_user text not null,      -- 로그인 계정(보통 이메일 주소)
  smtp_password text not null,  -- 앱 비밀번호. user_api_keys와 동일하게 평문 저장 + RLS로 보호.
  from_name text,               -- 발신자 표시 이름
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stepmail_smtp_accounts_user_id_idx on public.stepmail_smtp_accounts(user_id);

-- AI로 작성한 이메일 본문(초안). blog의 AI 글쓰기 폼과 동일한 입력 구조(주제/키워드/참고링크/
-- 추천링크/추가지시사항)를 받아 GPT가 제목+본문을 만들고, 사용자가 검토/수정 후 저장한다.
create table public.stepmail_email_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,             -- AI에게 준 주제
  keywords text[] not null default '{}',
  reference_urls text[] not null default '{}',
  cta_text text,                   -- 추천 버튼 문구
  cta_url text,                    -- 추천 대상 URL
  custom_prompt text,              -- 추가 지시사항
  subject text not null,           -- 최종 제목(AI 생성 후 사용자 수정 가능)
  body_html text not null,         -- 최종 본문 HTML(AI 생성 후 사용자 수정 가능)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stepmail_email_drafts_user_id_idx on public.stepmail_email_drafts(user_id);

-- 예약 발송 캠페인: 어떤 초안을, 어떤 대상(리드 상태)에게, 얼마나(수량), 언제(시간대),
-- 얼마나 자주(반복주기) 보낼지 정의한다. 실제 실행은 app/api/cron/dispatch가 매시간 돌면서
-- 이 표를 확인해 조건이 맞으면 발송한다.
create table public.stepmail_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  draft_id uuid not null references public.stepmail_email_drafts(id) on delete cascade,
  name text not null,
  target_status text not null default 'new'
    check (target_status in ('new','step1_sent')),  -- 'step1_sent'면 2차(리마인드) 발송 캠페인
  quantity_per_run int not null default 50 check (quantity_per_run > 0 and quantity_per_run <= 500),
  send_hour int not null default 9 check (send_hour between 0 and 23),
  send_minute int not null default 0 check (send_minute between 0 and 59),
  recurrence text not null default 'once' check (recurrence in ('once','daily','weekly')),
  weekly_day int check (weekly_day between 0 and 6),  -- recurrence='weekly'일 때만 사용(0=일요일)
  is_active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stepmail_campaigns_user_id_idx on public.stepmail_campaigns(user_id);
create index stepmail_campaigns_active_idx on public.stepmail_campaigns(is_active) where is_active = true;

-- 캠페인이 로테이션해서 사용할 SMTP 계정들(N:M). 여러 계정에 순서대로 나눠 보내면 계정 하나당
-- 발송량이 줄어 스팸/평판 리스크를 분산시킬 수 있다.
create table public.stepmail_campaign_smtp_accounts (
  campaign_id uuid not null references public.stepmail_campaigns(id) on delete cascade,
  smtp_account_id uuid not null references public.stepmail_smtp_accounts(id) on delete cascade,
  sort_order int not null default 0,
  primary key (campaign_id, smtp_account_id)
);

-- 발송 이력(감사 + 중복방지). 캠페인이 삭제돼도 이력은 남긴다(campaign_id set null).
create table public.stepmail_send_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.stepmail_campaigns(id) on delete set null,
  lead_id uuid not null references public.stepmail_leads(id) on delete cascade,
  smtp_account_id uuid references public.stepmail_smtp_accounts(id) on delete set null,
  subject text,
  status text not null check (status in ('sent','failed')),
  error_message text,
  sent_at timestamptz not null default now()
);

create index stepmail_send_log_user_id_idx on public.stepmail_send_log(user_id);
create index stepmail_send_log_lead_id_idx on public.stepmail_send_log(lead_id);
create index stepmail_send_log_campaign_id_idx on public.stepmail_send_log(campaign_id);

-- updated_at 자동 갱신: AIMaster 공용 set_updated_at() 함수 재사용(이미 다른 서브프로젝트에서 생성됨).
create trigger stepmail_leads_set_updated_at
  before update on public.stepmail_leads
  for each row execute function public.set_updated_at();

create trigger stepmail_smtp_accounts_set_updated_at
  before update on public.stepmail_smtp_accounts
  for each row execute function public.set_updated_at();

create trigger stepmail_email_drafts_set_updated_at
  before update on public.stepmail_email_drafts
  for each row execute function public.set_updated_at();

create trigger stepmail_campaigns_set_updated_at
  before update on public.stepmail_campaigns
  for each row execute function public.set_updated_at();

-- RLS: 전부 owner-only. 웹훅이 없으므로(외부 콜백 없음) 전부 일반 사용자 흐름 + cron(admin
-- service role, RLS 우회 + user_id로 직접 필터링)만으로 충분하다.
alter table public.stepmail_leads enable row level security;
alter table public.stepmail_smtp_accounts enable row level security;
alter table public.stepmail_email_drafts enable row level security;
alter table public.stepmail_campaigns enable row level security;
alter table public.stepmail_campaign_smtp_accounts enable row level security;
alter table public.stepmail_send_log enable row level security;

create policy "stepmail_leads_owner_select" on public.stepmail_leads for select using (auth.uid() = user_id);
create policy "stepmail_leads_owner_insert" on public.stepmail_leads for insert with check (auth.uid() = user_id);
create policy "stepmail_leads_owner_update" on public.stepmail_leads for update using (auth.uid() = user_id);
create policy "stepmail_leads_owner_delete" on public.stepmail_leads for delete using (auth.uid() = user_id);

create policy "stepmail_smtp_accounts_owner_select" on public.stepmail_smtp_accounts for select using (auth.uid() = user_id);
create policy "stepmail_smtp_accounts_owner_insert" on public.stepmail_smtp_accounts for insert with check (auth.uid() = user_id);
create policy "stepmail_smtp_accounts_owner_update" on public.stepmail_smtp_accounts for update using (auth.uid() = user_id);
create policy "stepmail_smtp_accounts_owner_delete" on public.stepmail_smtp_accounts for delete using (auth.uid() = user_id);

create policy "stepmail_email_drafts_owner_select" on public.stepmail_email_drafts for select using (auth.uid() = user_id);
create policy "stepmail_email_drafts_owner_insert" on public.stepmail_email_drafts for insert with check (auth.uid() = user_id);
create policy "stepmail_email_drafts_owner_update" on public.stepmail_email_drafts for update using (auth.uid() = user_id);
create policy "stepmail_email_drafts_owner_delete" on public.stepmail_email_drafts for delete using (auth.uid() = user_id);

create policy "stepmail_campaigns_owner_select" on public.stepmail_campaigns for select using (auth.uid() = user_id);
create policy "stepmail_campaigns_owner_insert" on public.stepmail_campaigns for insert with check (auth.uid() = user_id);
create policy "stepmail_campaigns_owner_update" on public.stepmail_campaigns for update using (auth.uid() = user_id);
create policy "stepmail_campaigns_owner_delete" on public.stepmail_campaigns for delete using (auth.uid() = user_id);

create policy "stepmail_campaign_smtp_accounts_owner_select" on public.stepmail_campaign_smtp_accounts for select
  using (exists (select 1 from public.stepmail_campaigns c where c.id = campaign_id and c.user_id = auth.uid()));
create policy "stepmail_campaign_smtp_accounts_owner_insert" on public.stepmail_campaign_smtp_accounts for insert
  with check (exists (select 1 from public.stepmail_campaigns c where c.id = campaign_id and c.user_id = auth.uid()));
create policy "stepmail_campaign_smtp_accounts_owner_delete" on public.stepmail_campaign_smtp_accounts for delete
  using (exists (select 1 from public.stepmail_campaigns c where c.id = campaign_id and c.user_id = auth.uid()));

create policy "stepmail_send_log_owner_select" on public.stepmail_send_log for select using (auth.uid() = user_id);
create policy "stepmail_send_log_owner_insert" on public.stepmail_send_log for insert with check (auth.uid() = user_id);
