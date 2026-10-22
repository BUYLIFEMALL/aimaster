-- 2026-10-23 Step Mail v1.27 문자(SMS·LMS) 차수 발송 (주인님 승인: 운영 DB 칸 추가). 기존 행 변경·삭제 없음.
-- 문자 계정은 공용 user_solapi_accounts(crm-google-form 0003·0005)를 그대로 쓴다 — 새 표 없음.

-- 리드 핸드폰 번호(선택, 010-1234-5678 형식으로 저장)
alter table public.stepmail_leads add column if not exists phone text;

-- 캠페인 발송 채널과 문자 본문·수신거부 안내. 문자 전용 캠페인은 이메일 초안이 없어 draft_id 빈칸 허용.
alter table public.stepmail_campaigns
  add column if not exists channel text not null default 'email',
  add column if not exists sms_text text,
  add column if not exists sms_optout text;
alter table public.stepmail_campaigns drop constraint if exists stepmail_campaigns_channel_check;
alter table public.stepmail_campaigns add constraint stepmail_campaigns_channel_check check (channel in ('email', 'sms', 'both'));
alter table public.stepmail_campaigns alter column draft_id drop not null;

-- 발송 기록 채널·받는 번호
alter table public.stepmail_send_log
  add column if not exists channel text not null default 'email',
  add column if not exists to_phone text;

update public.programs set version = 'v1.27', updated_at = now() where slug = 'stepmail';
