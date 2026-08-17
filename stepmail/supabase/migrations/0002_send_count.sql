-- stepmail_leads: 발송 횟수(1~10차)를 명시적으로 관리하기 위해 status의 step1_sent/step2_sent를
-- 없애고 send_count(정수)로 일반화한다. 상태는 new(미발송/발송중 공통) / customer_completed /
-- stopped 3가지로 단순화하고, "몇 차 발송"인지는 send_count로 표현한다.
alter table public.stepmail_leads
  add column send_count int not null default 0,
  add column last_sent_at timestamptz;

update public.stepmail_leads set send_count = 1, last_sent_at = step1_sent_at where status = 'step1_sent';
update public.stepmail_leads set send_count = 2, last_sent_at = step2_sent_at where status = 'step2_sent';
update public.stepmail_leads set status = 'new' where status in ('step1_sent', 'step2_sent');

alter table public.stepmail_leads add constraint stepmail_leads_send_count_check check (send_count >= 0 and send_count <= 10);

alter table public.stepmail_leads drop constraint stepmail_leads_status_check;
alter table public.stepmail_leads add constraint stepmail_leads_status_check check (status in ('new','customer_completed','stopped'));

alter table public.stepmail_leads drop column step1_sent_at;
alter table public.stepmail_leads drop column step2_sent_at;

-- stepmail_campaigns: target_status(new/step1_sent 2단계 고정) 대신 target_send_count(0~9)로
-- 일반화해서 캠페인이 노릴 "현재까지 몇 번 받은 리드"를 자유롭게 고를 수 있게 한다(1차~10차 발송).
alter table public.stepmail_campaigns add column target_send_count int not null default 0;
alter table public.stepmail_campaigns add constraint stepmail_campaigns_target_send_count_check check (target_send_count >= 0 and target_send_count <= 9);
alter table public.stepmail_campaigns drop constraint stepmail_campaigns_target_status_check;
alter table public.stepmail_campaigns drop column target_status;
