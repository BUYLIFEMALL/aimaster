-- 제휴 타깃 찾기(v1.10) — 초안, 미적용(2026-11-05 맥미니). 운영 적용 전 주인님 DB 변경 승인 필요(이 프로그램 AGENTS.md §2-5).
-- 근거: 마케팅 수집 예외 지침 §4(당사자가 공개한 비즈니스 연락처, 그 공개 목적 범위·회원 본인 책임), 최상위 규칙 §8 지정 기록.
-- 원칙: 회원 본인 소유(user_id + RLS), 만든 시각 기준 30일 뒤 조회 차단·매시 11분(UTC) 정리, 관리자·시험 계정(profiles.retention_exempt) 열외.
--   연락처 칸(public_phone·public_email)은 회원이 그 채널의 공개 페이지에서 직접 확인해 적는 값만 — 서버가 페이지를 긁지 않는다.

create table public.competitor_partner_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null check (length(keyword) between 1 and 60),
  channel_type text not null check (channel_type in ('blog','local','cafe','shop')),
  name text not null check (length(name) between 1 and 200),
  url text not null default '' check (length(url) <= 500),
  summary text not null default '' check (length(summary) <= 500),
  category text not null default '' check (length(category) <= 200),
  address text not null default '' check (length(address) <= 300),
  public_phone text check (public_phone is null or length(public_phone) between 7 and 40),
  public_email text check (public_email is null or (length(public_email) <= 200 and public_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  contact_note text check (contact_note is null or length(contact_note) <= 300),
  -- 주제 매칭 점수(0~100)와 이유 — 기준 미만은 애초에 저장하지 않는다(주인님 「매칭되는 사람만」).
  match_score int not null default 0 check (match_score between 0 and 100),
  match_reasons text not null default '' check (length(match_reasons) <= 300),
  -- 자동 스캔(회원 PC 확장)이 공개 페이지에서 읽은 값 — 플랜 PLAN_20261105_PARTNER_FINDER.md 단계 1·2.
  display_name text check (display_name is null or length(display_name) <= 100),
  public_id text check (public_id is null or length(public_id) <= 100),
  phones_mobile text[] not null default '{}' check (cardinality(phones_mobile) <= 5),
  phones_landline text[] not null default '{}' check (cardinality(phones_landline) <= 5),
  emails text[] not null default '{}' check (cardinality(emails) <= 5),
  primary_contact text check (primary_contact is null or length(primary_contact) <= 200),
  primary_type text check (primary_type is null or primary_type in ('mobile','landline','email')),
  scan_status text not null default 'pending' check (scan_status in ('pending','scanning','done','none','stopped')),
  scanned_at timestamptz,
  profile_match_score int not null default 0 check (profile_match_score between 0 and 60),
  created_at timestamptz not null default now(),
  unique (user_id, channel_type, name, url)
);
create index competitor_partner_channels_owner_idx on public.competitor_partner_channels(user_id, created_at desc);
create index competitor_partner_channels_scan_idx on public.competitor_partner_channels(user_id, scan_status);
create index competitor_partner_channels_score_idx on public.competitor_partner_channels(user_id, match_score desc);
create index competitor_partner_channels_created_idx on public.competitor_partner_channels(created_at);

-- 켤 때 고지 동의(공개 비즈니스 연락처만·공개 목적 범위·회원 참고용·회원 책임). 문구가 바뀌면 notice_version을 올려 다시 받는다.
create table public.competitor_partner_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notice_version int not null check (notice_version >= 1),
  -- 이메일 자동수집은 정보통신망법 제50조의2 위험 → 기본 꺼짐, 회원이 켤 때만(주인님 결정 전 추천안).
  collect_email boolean not null default false,
  agreed_at timestamptz not null default now()
);

-- 관리자·시험 계정 열외 판정(이메일을 코드에 적지 않음).
create function public.competitor_retention_exempt(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.retention_exempt from public.profiles p where p.id = p_user), false);
$$;
revoke all on function public.competitor_retention_exempt(uuid) from public, anon;
grant execute on function public.competitor_retention_exempt(uuid) to authenticated, service_role;

alter table public.competitor_partner_channels enable row level security;
revoke all on public.competitor_partner_channels from public, anon, authenticated;
grant select, insert, delete on public.competitor_partner_channels to authenticated;
-- 회원이 고칠 수 있는 것은 직접 확인해 적는 연락처 칸뿐(이름·주소·만든 시각은 못 바꿈).
-- 회원이 고칠 수 있는 것: 직접 적는 연락처·메모, 오탐을 지우는 스캔 결과 칸(이름·주소·점수·만든 시각은 못 바꿈). 스캔 결과 저장은 서버(service_role)가.
grant update (public_phone, public_email, contact_note, phones_mobile, phones_landline, emails, primary_contact, primary_type) on public.competitor_partner_channels to authenticated;
grant all on public.competitor_partner_channels to service_role;
create policy competitor_partner_channels_owner_select on public.competitor_partner_channels
  for select to authenticated using ((select auth.uid()) = user_id
    and (created_at > now() - interval '30 days' or public.competitor_retention_exempt(user_id)));
create policy competitor_partner_channels_owner_insert on public.competitor_partner_channels
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy competitor_partner_channels_owner_update on public.competitor_partner_channels
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy competitor_partner_channels_owner_delete on public.competitor_partner_channels
  for delete to authenticated using ((select auth.uid()) = user_id);
-- 만든 시각은 DB 시각으로만(기존 공용 트리거 재사용 — UPDATE 때 원래 값 유지).
create trigger competitor_partner_channels_stamp before insert or update on public.competitor_partner_channels
  for each row execute function public.competitor_stamp_content_created_at();

alter table public.competitor_partner_consents enable row level security;
revoke all on public.competitor_partner_consents from public, anon, authenticated;
grant select, insert, update, delete on public.competitor_partner_consents to authenticated;
grant all on public.competitor_partner_consents to service_role;
create policy competitor_partner_consents_owner on public.competitor_partner_consents
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 30일 정리(열외 회원 제외). postgres(cron 소유자)만 실행.
create function public.cleanup_competitor_partner_channels() returns jsonb
language plpgsql set search_path = '' as $$
declare n bigint;
begin
  delete from public.competitor_partner_channels c
   where c.created_at <= now() - interval '30 days' and not public.competitor_retention_exempt(c.user_id);
  get diagnostics n = row_count;
  return jsonb_build_object('partner_channels', n);
end;
$$;
revoke all on function public.cleanup_competitor_partner_channels() from public, anon, authenticated, service_role;
select cron.schedule('competitor-partner-channels-retention-30d', '11 * * * *',
  'select public.cleanup_competitor_partner_channels();');
