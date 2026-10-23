-- Separate explicit approval required: enables Supabase Cron and schedules retention.
-- Only this new program's expired projects are removed; no other program is touched.
create extension if not exists pg_cron with schema pg_catalog;
create index dt_projects_expiry on public.dt_projects (expires_at);
select cron.schedule('document-translator-project-retention','35 * * * *',
  $$delete from public.dt_projects where expires_at<=now();
    delete from public.dt_operations where created_at<now()-interval '24 hours'$$);
