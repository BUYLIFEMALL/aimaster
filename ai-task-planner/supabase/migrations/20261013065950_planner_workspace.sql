-- 적용 전 승인 필요. 기존 회원 데이터/키/권한 테이블은 변경하지 않습니다.
begin;

create table public.task_planner_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision integer not null default 0 check (revision >= 0),
  recent_commands uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint task_planner_payload_size check (octet_length(payload::text) <= 8388608)
);
alter table public.task_planner_workspaces enable row level security;
-- 개인 기록 API만 읽기/쓰기 가능합니다. 직접 REST 쓰기로 이용 권한을 우회할 수 없습니다.
revoke all on public.task_planner_workspaces from public, anon, authenticated;
grant select, insert, update on public.task_planner_workspaces to service_role;
create policy task_planner_owner_select on public.task_planner_workspaces
  for select to authenticated using ((select auth.uid()) = user_id);
-- 의도적으로 authenticated GRANT SELECT 없음. 회원 데이터 조회도 프로그램 권한 API를 통합니다.

create function public.task_planner_commit(
  p_user_id uuid, p_revision integer, p_command_id uuid, p_payload jsonb
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  current_row public.task_planner_workspaces%rowtype;
begin
  -- 서비스 역할에만 EXECUTE 부여. user_id는 권한을 확인한 서버 세션에서 전달합니다.
  select * into current_row from public.task_planner_workspaces
    where user_id = p_user_id for update;
  if not found then raise exception 'workspace not found' using errcode = 'P0002'; end if;
  if p_command_id = any(current_row.recent_commands) then
    return jsonb_build_object('payload', current_row.payload, 'revision', current_row.revision, 'recent_commands', current_row.recent_commands);
  end if;
  if p_revision <> current_row.revision then
    raise exception 'revision conflict' using errcode = '40001';
  end if;
  update public.task_planner_workspaces set payload = p_payload,
    revision = revision + 1,
    recent_commands = (array_append(current_row.recent_commands, p_command_id))[greatest(1, cardinality(current_row.recent_commands) - 198):],
    updated_at = clock_timestamp()
    where user_id = p_user_id
    returning * into current_row;
  return jsonb_build_object('payload', current_row.payload, 'revision', current_row.revision, 'recent_commands', current_row.recent_commands);
end;
$$;
revoke all on function public.task_planner_commit(uuid, integer, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.task_planner_commit(uuid, integer, uuid, jsonb) to service_role;

commit;
