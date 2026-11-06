-- naver-cafe-recruit 모드 A-1: 카페 활동 회원 명단(닉네임·등급·게시판) + 내 카페 초대링크 (2026-11-06 윈도우, 주인님 DB 승인)
-- 플랜: naver-cafe-recruit/docs/PLAN_20261106_MODE_A1.md §2
-- 추가만: 기존 표·ncr_dispatch·ncr_cleanup 동작은 바꾸지 않는다.
--   새 표 ncr_members, ncr_settings.invite_link 칸, 새 함수 ncr_member_dispatch · ncr_member_cleanup.
-- 아이디·회원 번호·연락처는 저장하지 않는다(회원 화면에 아이디가 없음 — docs/DOM_CHECK_20261105.md §0).
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

-- 1) 내 카페 초대링크(카페 초대 화면 「초대링크 복사」 값). 홍보 글·블로그에 넣어 아이디 없이 모집.
alter table public.ncr_settings add column if not exists invite_link text
 check(invite_link is null or (char_length(invite_link)<=300 and invite_link ~ '^https://(cafe\.naver\.com|naver\.me|m\.cafe\.naver\.com)/'));

-- 2) 카페 활동 회원 명단: 같은 회원·같은 카페·같은 닉네임은 한 줄(마지막 본 게시판·시각만 갱신)
create table if not exists public.ncr_members (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 cafe_id text not null check(cafe_id ~ '^[0-9]{1,15}$'),
 cafe_name text check(char_length(cafe_name)<=100),
 board_id text check(char_length(board_id)<=15),
 board_name text check(char_length(board_name)<=100),
 nickname text not null check(char_length(nickname) between 1 and 40),
 member_grade text check(char_length(member_grade)<=50),
 first_seen_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 expires_at timestamptz not null default(now()+interval '720 hours'),  -- 30일(열외 계정은 트리거가 9999로)
 unique(user_id,cafe_id,nickname)
);
create index if not exists ncr_members_owner on public.ncr_members(user_id,last_seen_at desc);
create index if not exists ncr_members_sweep on public.ncr_members(expires_at);
alter table public.ncr_members enable row level security;
revoke all on public.ncr_members from public,anon,authenticated;
drop trigger if exists ncr_members_keep_exempt on public.ncr_members;
create trigger ncr_members_keep_exempt before insert or update on public.ncr_members
 for each row execute function ncr_private.keep_exempt_expiry();

-- 3) 명단·초대링크 전용 함수(service_role). ncr_dispatch와 같은 회원별 잠금 키를 쓴다.
create or replace function public.ncr_member_dispatch(p_user_id uuid, p_operation text, p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_now timestamptz:=clock_timestamp();
 v_day_start timestamptz:=(((clock_timestamp() at time zone 'Asia/Seoul')::date)::timestamp at time zone 'Asia/Seoul');
 v_cap constant int:=3000; v_today int; v_ins int:=0; v_upd int:=0; v_skip int:=0; r jsonb; v_nick text; v_result jsonb; v_link text; v_new boolean;
begin
 if p_user_id is null or jsonb_typeof(coalesce(p_payload,'{}'::jsonb)) is distinct from 'object' then raise exception 'NCR_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 80551));
 delete from public.ncr_members where user_id=p_user_id and expires_at<=v_now;

 if p_operation='members_add' then
  -- 확장이 게시판 목록 한 페이지에서 읽은 작성자(닉네임·등급). 모드 A가 켜져 있고 책임 고지 동의가 있어야 한다.
  if not exists(select 1 from public.ncr_settings where user_id=p_user_id and mode_extract and extract_consent_at is not null)
   then raise exception 'NCR_EXTRACT_NOT_ENABLED'; end if;
  if coalesce(p_payload->>'cafe_id','') !~ '^[0-9]{1,15}$' or jsonb_typeof(p_payload->'rows') is distinct from 'array'
   or jsonb_array_length(p_payload->'rows')>50 or coalesce(p_payload->>'board_id','') !~ '^[0-9]{0,15}$' then raise exception 'NCR_INPUT'; end if;
  select count(*) into v_today from public.ncr_members where user_id=p_user_id and last_seen_at>=v_day_start;
  if v_today+jsonb_array_length(p_payload->'rows')>v_cap then
   return jsonb_build_object('ok',false,'reason','daily_cap','today',v_today,'cap',v_cap); end if;
  for r in select * from jsonb_array_elements(p_payload->'rows') loop
   v_nick:=btrim(coalesce(r->>'nickname',''));
   if char_length(v_nick) not between 1 and 40 then v_skip:=v_skip+1; continue; end if;
   insert into public.ncr_members(user_id,cafe_id,cafe_name,board_id,board_name,nickname,member_grade)
   values(p_user_id, p_payload->>'cafe_id', left(p_payload->>'cafe_name',100), nullif(p_payload->>'board_id',''),
          left(p_payload->>'board_name',100), v_nick, left(r->>'member_grade',50))
   on conflict(user_id,cafe_id,nickname) do update set
    member_grade=coalesce(excluded.member_grade,public.ncr_members.member_grade),
    board_id=coalesce(excluded.board_id,public.ncr_members.board_id),
    board_name=coalesce(excluded.board_name,public.ncr_members.board_name),
    cafe_name=coalesce(excluded.cafe_name,public.ncr_members.cafe_name),
    last_seen_at=v_now
   returning (xmax=0) into strict v_new;
   if v_new then v_ins:=v_ins+1; else v_upd:=v_upd+1; end if;
  end loop;
  return jsonb_build_object('ok',true,'added',v_ins,'updated',v_upd,'skipped',v_skip,'today',v_today+v_ins+v_upd,'cap',v_cap);

 elsif p_operation='members_list' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.last_seen_at desc),'[]'::jsonb) into v_result
   from (select id,cafe_id,cafe_name,board_id,board_name,nickname,member_grade,first_seen_at,last_seen_at
         from public.ncr_members where user_id=p_user_id order by last_seen_at desc limit 2000) x;
  return jsonb_build_object('members',v_result);

 elsif p_operation='invite_link_save' then
  v_link:=nullif(btrim(coalesce(p_payload->>'invite_link','')),'');
  if v_link is not null and (char_length(v_link)>300 or v_link !~ '^https://(cafe\.naver\.com|naver\.me|m\.cafe\.naver\.com)/') then raise exception 'NCR_INPUT'; end if;
  insert into public.ncr_settings(user_id,invite_link,updated_at) values(p_user_id,v_link,v_now)
  on conflict(user_id) do update set invite_link=excluded.invite_link, updated_at=v_now;
  return jsonb_build_object('ok',true,'invite_link',v_link);

 else
  raise exception 'NCR_UNKNOWN_OP';
 end if;
end $$;
revoke all on function public.ncr_member_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.ncr_member_dispatch(uuid,text,jsonb) to service_role;

-- 4) 명단 매일 30일 정리(모든 회원, 한 번에 5천 줄). 크론이 ncr_cleanup과 함께 부른다.
create or replace function public.ncr_member_cleanup() returns jsonb
language plpgsql security definer set search_path='' as $$
declare n int;
begin
 with d as (select id from public.ncr_members where expires_at<=clock_timestamp() order by expires_at limit 5000)
  delete from public.ncr_members x using d where x.id=d.id;
 get diagnostics n=row_count;
 return jsonb_build_object('membersRemoved',n);
end $$;
revoke all on function public.ncr_member_cleanup() from public,anon,authenticated;
grant execute on function public.ncr_member_cleanup() to service_role;
commit;
