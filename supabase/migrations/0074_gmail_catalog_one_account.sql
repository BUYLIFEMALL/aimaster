-- 2026-11-17 E4 Gmail(ai-work-workspace) F03 — 공용 연동 카탈로그에 google_gmail 1줄 + 「회원당 Gmail 연결 1개」 부분 고유 인덱스.
-- 플랜: ai-work-workspace/docs/PLAN_20261117_E4_GMAIL_F03_A2.md §1 안 A · 대상 DB: AIMaster 운영(ref esgxyikcnnvmlhygjkth) — **적용은 주인님 승인 뒤**.
-- 공용 저장 함수(saveMemberAccount)·다른 플랫폼 데이터·RLS·기존 제약은 바꾸지 않는다(추가만).
-- 잠금: 인덱스 생성은 member_platform_accounts 전체에 SHARE 잠금을 잡아 그동안 다른 플랫폼 연결 저장·갱신도 잠깐 기다린다
--       (데이터·동작 변화는 google_gmail 줄에만). 대상 줄이 0이면 짧지만 표 전체 줄 수만큼 훑으므로 0초는 아님. lock_timeout으로 오래 기다리지 않고 실패.
-- 멈춤(예외로 전체 되돌림, 아무것도 지우지 않음): ① 이미 한 회원에 google_gmail 줄이 2개 이상
--   ② 카탈로그 google_gmail 줄이 있는데 기능 칸(kind·key_names·scope_sets·connect_program_url)이 다르거나 is_active=false
--      (표시·관리 칸 label·description·guide_id·sort_order는 비교·덮어쓰기 0)
--   ③ 같은 이름 객체가 인덱스가 아니거나, 대상 표가 다르거나, 고유·유효·준비·활성이 아니거나(예: 실패한 CONCURRENTLY가 남긴 무효 인덱스), 정의가 다름
--   ④ 만든 뒤 같은 검증 실패.
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
  ix record;
begin
  -- ① 중복 연결 먼저 확인(있으면 멈춤 — 지우지 않음)
  select count(*) into dup from (
    select user_id from public.member_platform_accounts where platform = 'google_gmail' group by user_id having count(*) > 1
  ) d;
  if dup > 0 then
    raise exception 'gmail_one_account: % member(s) already have 2+ google_gmail rows — stop (no delete)', dup;
  end if;

  -- ② 카탈로그: 없으면 넣고, 있으면 **기능에 쓰이는 칸**이 정확히 같아야 통과(is_active=false도 멈춤).
  --    표시·관리용 칸(label·description·guide_id·sort_order)은 관리자 화면에서 바꿀 수 있어 비교하지 않고, 덮어쓰지도 않음(있는 값 그대로).
  select * into cat from public.integration_catalog where key = 'google_gmail';
  if not found then
    insert into public.integration_catalog (key, kind, label, description, key_names, scope_sets, guide_id, connect_program_url, sort_order, is_active)
    values ('google_gmail', 'oauth_account', 'Gmail(받은 편지함 목록)', '본인 Google 앱으로 연결한 Gmail의 받은 편지함 최근 메일 제목·보낸 사람·날짜 보기(본문 읽기 없음).',
            array['google_client_id', 'google_client_secret'], '{"metadata": ["https://www.googleapis.com/auth/gmail.metadata"]}'::jsonb,
            null, 'https://ai-work-workspace.buylife.xyz/inbox', 63, true);
  elsif cat.kind is distinct from 'oauth_account'
     or cat.key_names is distinct from array['google_client_id', 'google_client_secret']
     or cat.scope_sets is distinct from '{"metadata": ["https://www.googleapis.com/auth/gmail.metadata"]}'::jsonb
     or cat.connect_program_url is distinct from 'https://ai-work-workspace.buylife.xyz/inbox'
     or cat.is_active is distinct from true then
    raise exception 'gmail_one_account: integration_catalog google_gmail exists with different functional fields or inactive — stop';
  end if;

  -- ③ 같은 이름 객체: public 스키마의 진짜 인덱스이고, 대상 표·고유·유효(indisvalid)·준비(indisready)·활성(indislive)·정의가 모두 맞아야 통과.
  --    예: CREATE UNIQUE INDEX CONCURRENTLY가 실패하면 같은 정의의 「무효」 인덱스가 남아 조건을 보장하지 못함 → 자동 DROP/REINDEX 0, 멈춤.
  select c.relkind, i.indrelid, i.indisunique, i.indisvalid, i.indisready, i.indislive, pg_get_indexdef(c.oid) as def
    into ix
    from pg_class c join pg_namespace n on n.oid = c.relnamespace left join pg_index i on i.indexrelid = c.oid
   where n.nspname = 'public' and c.relname = 'member_platform_accounts_gmail_one';
  if not found then
    execute 'create unique index member_platform_accounts_gmail_one on public.member_platform_accounts (user_id) where platform = ''google_gmail''';
    select c.relkind, i.indrelid, i.indisunique, i.indisvalid, i.indisready, i.indislive, pg_get_indexdef(c.oid) as def
      into ix
      from pg_class c join pg_namespace n on n.oid = c.relnamespace left join pg_index i on i.indexrelid = c.oid
     where n.nspname = 'public' and c.relname = 'member_platform_accounts_gmail_one';
  end if;
  -- ④ 생성 전·후 공통 검증
  if ix.relkind is distinct from 'i'
     or ix.indrelid is distinct from 'public.member_platform_accounts'::regclass
     or ix.indisunique is distinct from true
     or ix.indisvalid is distinct from true
     or ix.indisready is distinct from true
     or ix.indislive is distinct from true then
    raise exception 'gmail_one_account: index member_platform_accounts_gmail_one is not a valid/ready/live unique index on public.member_platform_accounts — stop (no drop/reindex)';
  end if;
  if ix.def is distinct from want_def then
    raise exception 'gmail_one_account: index definition mismatch: %', ix.def;
  end if;
end $$;

commit;

-- 확인용(적용 뒤 읽기만)
select key, kind, connect_program_url from public.integration_catalog where key = 'google_gmail';
select indexdef from pg_indexes where schemaname = 'public' and indexname = 'member_platform_accounts_gmail_one';
