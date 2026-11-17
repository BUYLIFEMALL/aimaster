-- 2026-11-17 E4 Gmail(ai-work-workspace) F03 — 공용 연동 카탈로그에 google_gmail 1줄 + 「회원당 Gmail 연결 1개」 부분 고유 인덱스.
-- 플랜: ai-work-workspace/docs/PLAN_20261117_E4_GMAIL_F03_A2.md §1 안 A · 대상 DB: AIMaster 운영(ref esgxyikcnnvmlhygjkth) — **적용은 주인님 승인 뒤**.
-- 공용 저장 함수(saveMemberAccount)·다른 플랫폼 데이터·RLS·기존 제약은 바꾸지 않는다(추가만).
-- 잠금: 인덱스 생성은 member_platform_accounts 전체에 SHARE 잠금을 잡아 그동안 다른 플랫폼 연결 저장·갱신도 잠깐 기다린다
--       (데이터·동작 변화는 google_gmail 줄에만). 대상 줄이 0이면 짧지만 표 전체 줄 수만큼 훑으므로 0초는 아님. lock_timeout으로 오래 기다리지 않고 실패.
-- 멈춤(예외로 전체 되돌림, 아무것도 지우지 않음): ① 이미 한 회원에 google_gmail 줄이 2개 이상 ② 카탈로그 google_gmail 줄이 있는데 내용이 다름
--   ③ 같은 이름 인덱스가 있는데 정의가 다름 ④ 만든 뒤 정의 검증 실패.
-- 되돌리기(수동, 자동 실행 0 — 연결이 남아 있으면 카탈로그는 지우지 말 것):
--   drop index if exists public.member_platform_accounts_gmail_one;
--   delete from public.integration_catalog c where c.key = 'google_gmail'
--     and not exists (select 1 from public.member_platform_accounts a where a.platform = 'google_gmail');
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
declare
  dup int;
  cat record;
  want_def constant text := 'CREATE UNIQUE INDEX member_platform_accounts_gmail_one ON public.member_platform_accounts USING btree (user_id) WHERE (platform = ''google_gmail''::text)';
  have_def text;
begin
  -- ① 중복 연결 먼저 확인(있으면 멈춤 — 지우지 않음)
  select count(*) into dup from (
    select user_id from public.member_platform_accounts where platform = 'google_gmail' group by user_id having count(*) > 1
  ) d;
  if dup > 0 then
    raise exception 'gmail_one_account: % member(s) already have 2+ google_gmail rows — stop (no delete)', dup;
  end if;

  -- ② 카탈로그: 없으면 넣고, 있으면 내용이 정확히 같아야 통과
  select * into cat from public.integration_catalog where key = 'google_gmail';
  if not found then
    insert into public.integration_catalog (key, kind, label, description, key_names, scope_sets, guide_id, connect_program_url, sort_order, is_active)
    values ('google_gmail', 'oauth_account', 'Gmail(받은 편지함 목록)', '본인 Google 앱으로 연결한 Gmail의 받은 편지함 최근 메일 제목·보낸 사람·날짜 보기(본문 읽기 없음).',
            array['google_client_id', 'google_client_secret'], '{"metadata": ["https://www.googleapis.com/auth/gmail.metadata"]}'::jsonb,
            null, 'https://ai-work-workspace.buylife.xyz/inbox', 63, true);
  elsif cat.kind is distinct from 'oauth_account'
     or cat.label is distinct from 'Gmail(받은 편지함 목록)'
     or cat.key_names is distinct from array['google_client_id', 'google_client_secret']
     or cat.scope_sets is distinct from '{"metadata": ["https://www.googleapis.com/auth/gmail.metadata"]}'::jsonb
     or cat.connect_program_url is distinct from 'https://ai-work-workspace.buylife.xyz/inbox' then
    raise exception 'gmail_one_account: integration_catalog google_gmail exists with different content — stop';
  end if;

  -- ③ 같은 이름 인덱스: 있으면 정의가 같아야 통과, 없으면 만듦
  select indexdef into have_def from pg_indexes where schemaname = 'public' and indexname = 'member_platform_accounts_gmail_one';
  if have_def is null then
    execute 'create unique index member_platform_accounts_gmail_one on public.member_platform_accounts (user_id) where platform = ''google_gmail''';
    select indexdef into have_def from pg_indexes where schemaname = 'public' and indexname = 'member_platform_accounts_gmail_one';
  end if;
  -- ④ 정의 검증(테이블·열·조건·고유)
  if have_def is distinct from want_def then
    raise exception 'gmail_one_account: index definition mismatch: %', have_def;
  end if;
end $$;

commit;

-- 확인용(적용 뒤 읽기만)
select key, kind, connect_program_url from public.integration_catalog where key = 'google_gmail';
select indexdef from pg_indexes where schemaname = 'public' and indexname = 'member_platform_accounts_gmail_one';
