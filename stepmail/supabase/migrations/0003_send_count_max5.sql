-- 발송 차수 상한을 10차에서 5차로 낮춘다(요구사항 변경).
alter table public.stepmail_leads drop constraint stepmail_leads_send_count_check;
alter table public.stepmail_leads add constraint stepmail_leads_send_count_check check (send_count >= 0 and send_count <= 5);

alter table public.stepmail_campaigns drop constraint stepmail_campaigns_target_send_count_check;
alter table public.stepmail_campaigns add constraint stepmail_campaigns_target_send_count_check check (target_send_count >= 0 and target_send_count <= 4);
