-- 2026-11-17 E4 Gmail(ai-work-workspace) A2-1 — 고른 Gmail 메일을 「받은 업무」로 한 거래에 넣는 클레임 표 + 함수(초안).
-- 플랜: ai-work-workspace/docs/PLAN_20261117_E4_GMAIL_F03_A2.md §2·§6 · 대상 DB: AIMaster 운영(ref esgxyikcnnvmlhygjkth) — **적용은 주인님 승인 뒤**(0074 다음).
-- 추가만: 공용 work_inbox 표 구조·RLS·다른 표 변경 0. 함수는 SECURITY INVOKER(정의자 권한 0), 실행은 service_role만.
-- 저장하는 것: 회원 id, 연결 계정 번호(sub)의 SHA-256 해시(원문 sub 저장 0 — 같은 sub면 같은 값이 나오는 해시라 익명은 아님),
--   Gmail 메시지 번호, 받은 업무 번호. 메일 본문·snippet·보낸 사람·이메일 저장 0. 받은 업무 줄에는 제목(회원이 고친 것)과 원문 링크만.
-- 보관: 클레임은 받은 업무 줄이 지워지면 함께 지워짐(on delete cascade) → 「같은 메일 중복 방지 = 그 받은 업무가 남아 있는 동안」.
--   받은 업무 1년 보관은 기존 관리자 지정 예외(docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §8, 2026-11-11 업무 받은편지함 1년) 그대로.
-- 되돌리기(수동, 자동 실행 0): drop function if exists public.gmail_inbox_add(uuid, text, text, text, text); drop table if exists public.gmail_inbox_claims;
--   (받은 업무 줄은 지우지 않음)
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- 이미 있으면 덮지 않고 멈춤(같은 이름을 다른 내용으로 조용히 통과하지 않음)
create table public.gmail_inbox_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  account_hash text not null check (account_hash ~ '^[0-9a-f]{64}$'),
  message_id text not null check (message_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  inbox_id uuid references public.work_inbox (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, account_hash, message_id)
);
comment on table public.gmail_inbox_claims is 'E4 Gmail → 받은 업무 중복 방지(회원·연결 계정 해시·메시지 번호). 서버 키 전용, 받은 업무 줄과 함께 삭제';
alter table public.gmail_inbox_claims enable row level security; -- 정책 없음: 회원(anon·authenticated)은 읽기·쓰기 0
revoke all on table public.gmail_inbox_claims from public, anon, authenticated;
grant select, insert, update, delete on table public.gmail_inbox_claims to service_role;

create function public.gmail_inbox_add(p_user uuid, p_account_hash text, p_message_id text, p_title text, p_source_url text)
returns table (status text, inbox_id uuid)
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_id uuid;
  v_new int;
  v_title text := btrim(coalesce(p_title, ''));
begin
  -- 입력 검사(서버가 계산해 넘기는 값이지만 함수도 한 번 더 막음 — 임의 URL·형식 위반 거절)
  if p_user is null
     or p_account_hash is null or p_account_hash !~ '^[0-9a-f]{64}$'
     or p_message_id is null or p_message_id !~ '^[A-Za-z0-9_-]{1,64}$' then
    raise exception 'gmail_inbox_add: invalid input' using errcode = '22023';
  end if;
  if char_length(v_title) not between 1 and 200 then
    raise exception 'gmail_inbox_add: invalid title' using errcode = '22023';
  end if;
  if p_source_url is distinct from ('https://mail.google.com/mail/u/0/#all/' || p_message_id) then
    raise exception 'gmail_inbox_add: invalid source url' using errcode = '22023';
  end if;

  -- 1) 클레임 먼저 선점. 같은 키를 다른 거래가 잡고 있으면 그 거래가 끝날 때까지 기다림(READ COMMITTED).
  insert into public.gmail_inbox_claims (user_id, account_hash, message_id)
  values (p_user, p_account_hash, p_message_id)
  on conflict do nothing;
  get diagnostics v_new = row_count;

  if v_new = 0 then
    -- 2) 이미 있음 → 커밋된 클레임의 받은 업무 번호를 그대로(멱등). 번호가 비었거나(정상 경로에서는 커밋 전에 채움) 그사이 지워졌으면 다시 시도 요청.
    select c.inbox_id into v_id
      from public.gmail_inbox_claims c
     where c.user_id = p_user and c.account_hash = p_account_hash and c.message_id = p_message_id;
    if v_id is null then
      raise exception 'gmail_inbox_add: claim changed, retry' using errcode = '40001';
    end if;
    return query select 'existing'::text, v_id;
    return;
  end if;

  -- 3) 받은 업무 1줄(제목·원문 링크만) → 클레임에 번호 연결. 어느 단계든 오류면 함수 전체가 되돌려져 클레임·업무 둘 다 남지 않음.
  insert into public.work_inbox (user_id, source_slug, kind, title, body_md, data, source_url, target_slug)
  values (p_user, 'ai-work-workspace', 'link', v_title, '', '{}'::jsonb, p_source_url, 'ai-work-workspace')
  returning id into v_id;
  update public.gmail_inbox_claims c set inbox_id = v_id
   where c.user_id = p_user and c.account_hash = p_account_hash and c.message_id = p_message_id;
  return query select 'added'::text, v_id;
end
$fn$;
comment on function public.gmail_inbox_add(uuid, text, text, text, text) is 'E4 Gmail: 고른 메일 1건을 받은 업무로(클레임 선점 → 업무 → 연결, 한 거래, 멱등). service_role 전용';
revoke all on function public.gmail_inbox_add(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.gmail_inbox_add(uuid, text, text, text, text) to service_role;

commit;
