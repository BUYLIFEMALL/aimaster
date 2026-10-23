-- Close an open RLS policy on user_program_access (found 2026-09-29).
-- "Service role full access" was created for every role (public) with USING (true) WITH CHECK (true),
-- so any signed-in user — or even the anon key — could grant themselves access to any program,
-- and read or delete other members' grants.
-- The service role bypasses RLS anyway, so the policy was never needed for admin writes
-- (app/api/admin/user-access uses createServiceClient()). Members only need to read their own rows
-- (lib/access/checkProgramAccess.ts, dashboard, each subproject's requireProgramAccess()).
-- Checked before applying: all 4,702 existing rows were granted by admin accounts.

drop policy if exists "Service role full access" on public.user_program_access;

drop policy if exists user_program_access_select_own on public.user_program_access;
create policy user_program_access_select_own
  on public.user_program_access
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Table privileges: members read only; writes go through the service role.
revoke insert, update, delete, truncate on public.user_program_access from anon, authenticated;
revoke all on public.user_program_access from anon;
grant select on public.user_program_access to authenticated;
