-- 네이버 카페 회원 모집 자동화 (naver-cafe-recruit) 최초 표 — 초안 (2026-11-05 맥미니, 미적용)
-- 플랜: naver-cafe-recruit/docs/PLAN_20261105_NEW.md · 기준 패턴: blog-neighbor-care 표·RLS·보관 기한·열외
-- 원칙: 회원 본인 소유 격리(owner-only), 직접 테이블 접근 없음(모든 접근은 security definer RPC + service_role),
--   보관 30일(720h) 확정(2026-11-05 주인님 「30일 기준으로 만들어도 되는 프로그램」, 연장 없음),
--   관리자·시험 계정(profiles.retention_exempt) 열외는 keep_exempt_expiry 트리거로.
-- ⚠️ 윈도우 세션: 적용 전 운영 DB(esgxyikcnnvmlhygjkth)에서 기존 ncr_* 이름 충돌 없는지 확인.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

create schema if not exists ncr_private;

-- 1) 회원별 설정: 모드 켜짐 여부·상한·시간대·동의
create table if not exists public.ncr_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 mode_known boolean not null default true,       -- B. 아는 사람
 mode_promo boolean not null default true,        -- C. 카페 홍보 글
 mode_extract boolean not null default false,     -- A. 카페 활동 회원 추출(관리자 지정 예외, 회원이 켬)
 extract_consent_at timestamptz,                  -- A를 켤 때 책임 고지 동의 시각
 daily_cap int not null default 20 check(daily_cap between 1 and 50),  -- 네이버 하루 50건의 절반 이하
 active_start_minute int not null default 540 check(active_start_minute between 0 and 1439), -- 09:00
 active_end_minute int not null default 1320 check(active_end_minute between 0 and 1439),    -- 22:00
 updated_at timestamptz not null default now()
);

-- 2) 모은 대상 명단 (A 추출·B 입력 공통). 같은 회원 안에서 네이버 아이디로 중복 제거.
create table if not exists public.ncr_targets (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 source_mode text not null check(source_mode in ('extract','known')),
 naver_id text not null check(char_length(naver_id) between 1 and 60),
 nickname text check(char_length(nickname)<=100),
 member_grade text check(char_length(member_grade)<=50),
 cafe_id text check(char_length(cafe_id)<=30),      -- 어느 카페에서 모았는지(A)
 board_name text check(char_length(board_name)<=100),
 article_title text check(char_length(article_title)<=200),
 state text not null default 'draft' check(state in ('draft','reviewed','skipped')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default(now()+interval '720 hours'),
 unique(user_id,naver_id)
);
create index if not exists ncr_targets_owner on public.ncr_targets(user_id,created_at desc);
create index if not exists ncr_targets_sweep on public.ncr_targets(expires_at);

-- 3) 보낸 초대 기록 (중복 초대 방지·결과). 이메일·전화는 저장하지 않음(지침 §4).
create table if not exists public.ncr_sent (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 cafe_id text not null check(char_length(cafe_id)<=30),  -- 초대 받은 내 카페
 naver_id text not null check(char_length(naver_id) between 1 and 60),
 result text not null check(result in ('sent','failed','limited')),
 detail text check(char_length(detail)<=200),
 sent_at timestamptz not null default now(),
 expires_at timestamptz not null default(now()+interval '720 hours'),  -- 30일 확정(연장 없음)
 unique(user_id,cafe_id,naver_id)
);
create index if not exists ncr_sent_owner on public.ncr_sent(user_id,sent_at desc);
create index if not exists ncr_sent_sweep on public.ncr_sent(expires_at);

-- 직접 접근 차단(모든 읽기·쓰기는 아래 RPC + service_role 로만)
alter table public.ncr_settings enable row level security;
alter table public.ncr_targets  enable row level security;
alter table public.ncr_sent     enable row level security;
revoke all on public.ncr_settings,public.ncr_targets,public.ncr_sent from public,anon,authenticated;

-- 관리자·시험 계정 열외: 30일 기한을 무기한(9999-12-31)으로(정리 함수는 안 고침)
create or replace function ncr_private.retention_exempt(p_user_id uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
 return coalesce((select p.retention_exempt from public.profiles p where p.id=p_user_id),false);
end $$;
revoke all on function ncr_private.retention_exempt(uuid) from public,anon,authenticated;
grant execute on function ncr_private.retention_exempt(uuid) to service_role;

create or replace function ncr_private.keep_exempt_expiry() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.expires_at>statement_timestamp()+interval '20 days' and new.expires_at<'9999-12-31 00:00:00+00'::timestamptz
  and ncr_private.retention_exempt(new.user_id) then
  new.expires_at:='9999-12-31 00:00:00+00'::timestamptz;
 end if;
 return new;
end $$;
revoke all on function ncr_private.keep_exempt_expiry() from public,anon,authenticated;

drop trigger if exists ncr_targets_keep_exempt on public.ncr_targets;
create trigger ncr_targets_keep_exempt before insert or update on public.ncr_targets
 for each row execute function ncr_private.keep_exempt_expiry();
drop trigger if exists ncr_sent_keep_exempt on public.ncr_sent;
create trigger ncr_sent_keep_exempt before insert or update on public.ncr_sent
 for each row execute function ncr_private.keep_exempt_expiry();

commit;

-- 다음 마이그레이션(별도): ncr_dispatch(p_user_id,p_operation,p_payload) — 만료 정리 + settings_get/save ·
--   targets_create(모드별)·targets_list·target_review·sent_mark. 실행·확장 계약은 blog-neighbor-care bnc_dispatch 방식을 따른다.
