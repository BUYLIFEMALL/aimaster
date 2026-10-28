-- An owner-approved single import can be started during the two-week test period.
-- The existing dispatch still limits each started run to 15 minutes and each nonce to 60 seconds.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $guard$
begin
 if not exists(select 1 from pg_constraint where conrelid='public.bnc_neighbor_import_permits'::regclass
   and conname='bnc_neighbor_import_permits_check' and pg_get_constraintdef(oid) like '%00:15:00%') then
  raise exception 'BNC_IMPORT_ACTIVATION_BASE_CHANGED';
 end if;
 if not exists(select 1 from pg_proc where oid='public.bnc_neighbor_import_dispatch(uuid,text,jsonb)'::regprocedure
   and not prosecdef and prosrc like '%least(v_now+interval ''15 minutes''%') then
  raise exception 'BNC_IMPORT_RUN_LIMIT_CHANGED';
 end if;
end $guard$;
alter table public.bnc_neighbor_import_permits
 drop constraint bnc_neighbor_import_permits_check,
 add constraint bnc_import_permit_activation_window
 check(valid_until>created_at and valid_until<=created_at+interval '14 days');
comment on column public.bnc_neighbor_import_permits.valid_until is
 'Deadline for the one allowed start (max 14 days). A started import remains limited to 15 minutes; nonces to 60 seconds. No global read or social permission.';
commit;
