-- 회원이 등록한 리포트를 "본인"뿐 아니라 본인이 관리하는 수신자 목록(전화번호)에도
-- 카카오톡으로 발송할 수 있게 한다. 실제 발송은 SOLAPI 브랜드메시지(2026-01-01부로
-- 친구톡 요청이 서버에서 자동으로 브랜드메시지로 대체 발송됨, lib/solapi/client.ts 참고)를
-- 그대로 재사용하며, 카카오 채널 친구가 아니어도 전화번호만 있으면 도달 가능하다.
create table if not exists public.kakao_broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phone text not null,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists kakao_broadcast_recipients_user_idx
  on public.kakao_broadcast_recipients (user_id, created_at desc);

alter table public.kakao_broadcast_recipients enable row level security;

create policy "kakao_broadcast_recipients_select_own"
  on public.kakao_broadcast_recipients for select
  using (auth.uid() = user_id);

create policy "kakao_broadcast_recipients_insert_own"
  on public.kakao_broadcast_recipients for insert
  with check (auth.uid() = user_id);

create policy "kakao_broadcast_recipients_delete_own"
  on public.kakao_broadcast_recipients for delete
  using (auth.uid() = user_id);

-- 리포트별로 "본인 알림"(kakao_sent_at/kakao_send_error)과는 별도로 수신자 목록 발송
-- 결과를 추적한다 — 두 발송 경로가 서로 성공/실패가 달라질 수 있어(예: 본인 알림은
-- 성공했지만 수신자 중 일부는 실패) 하나의 컬럼으로 합치지 않는다.
alter table public.kakao_reports
  add column if not exists broadcast_sent_at timestamptz,
  add column if not exists broadcast_error text;
