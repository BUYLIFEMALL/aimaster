-- Phase 4: 카카오 로그인("나에게 보내기" 무료 API) 연동.
-- 회원이 본인 소유 카카오톡 채널을 만들고 SOLAPI 계정까지 등록해야 했던 기존 방식(Phase 2,
-- user_solapi_accounts)은 진입장벽이 높고 건당 과금이 발생한다. 카카오 로그인만으로 본인의
-- "나와의 채팅방"에 무료로 리포트를 받아볼 수 있는 대안 채널을 추가한다 — SOLAPI 방식을
-- 대체하는 게 아니라 나란히 제공하는 선택지다(user_kakao_accounts가 있으면 이쪽을 우선 사용,
-- 없으면 기존 SOLAPI 경로로 폴백 — lib/kakaoSend.ts 참고).
--
-- 이 테이블은 threads_accounts/user_solapi_accounts와 같은 성격의 "사용자별 외부 계정 연동"
-- 테이블이라 향후 다른 서브프로젝트도 그대로 재사용할 수 있도록 user_ 접두사로 이름 붙였다
-- (재사용 시 새 마이그레이션 불필요 — user_solapi_accounts 선례와 동일).
create table if not exists public.user_kakao_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kakao_user_id text not null,
  nickname text,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  refresh_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_kakao_accounts_user_unique unique (user_id)
);

create trigger user_kakao_accounts_set_updated_at
  before update on public.user_kakao_accounts
  for each row execute function public.set_updated_at();

alter table public.user_kakao_accounts enable row level security;

create policy "user_kakao_accounts_select_own"
  on public.user_kakao_accounts for select
  using (auth.uid() = user_id);

create policy "user_kakao_accounts_insert_own"
  on public.user_kakao_accounts for insert
  with check (auth.uid() = user_id);

create policy "user_kakao_accounts_update_own"
  on public.user_kakao_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_kakao_accounts_delete_own"
  on public.user_kakao_accounts for delete
  using (auth.uid() = user_id);
