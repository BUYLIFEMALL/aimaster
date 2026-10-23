-- 2026-10-23 Step Mail v1.28 카카오 브랜드 메시지 선택지 (주인님 승인: DB 칸 2개 추가). 기존 행은 'sms'·false로 그대로 동작.
alter table public.stepmail_campaigns
  add column if not exists mobile_type text not null default 'sms',
  add column if not exists kakao_fallback_sms boolean not null default false;
alter table public.stepmail_campaigns drop constraint if exists stepmail_campaigns_mobile_type_check;
alter table public.stepmail_campaigns add constraint stepmail_campaigns_mobile_type_check check (mobile_type in ('sms', 'kakao'));

update public.programs set version = 'v1.28', updated_at = now() where slug = 'stepmail';
