-- v1.17 단계 C-1 (2): 같은 글·같은 동작 작업을 「만들 때부터」 막는다(주인님 승인 플랜 PLAN_20261104_STAGE_C_AUTOPILOT §2).
-- 지금은 실행 단계(claimed·armed·uncertain·succeeded)만 고유 장치 bnc_jobs_action_guard가 막아,
-- 초안·검토 완료 단계에서는 같은 글 공감 작업이 또 만들어져 쓸모없는 작업으로 남을 수 있었다.
-- 작업을 새로 넣는 곳은 bnc_dispatch('create') 한 곳뿐이지만, 앞으로 생길 경로까지 막도록 표에 트리거를 단다.
-- 기준은 기존 고유 장치와 같다(회원·계정 블로그·이웃·글·동작 종류, 대댓글은 댓글로 셈). 기존 자료는 바꾸지 않는다.
-- 「건너뜀·미실행·취소」나 보관 기한이 지난 작업은 막지 않는다(다시 만들 수 있음).
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

create or replace function bnc_private.block_duplicate_job() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.bnc_jobs x
   where x.user_id=new.user_id and x.actor_id=new.actor_id and x.neighbor_id=new.neighbor_id and x.post_id=new.post_id
     and x.budget_kind=(case when new.kind='reply' then 'comment' else new.kind end)
     and x.state in ('draft','ready','claimed','armed','uncertain','succeeded') and x.expires_at>statement_timestamp())
 then raise exception 'BNC_DUPLICATE_ACTION'; end if;
 return new;
end $$;
revoke all on function bnc_private.block_duplicate_job() from public,anon,authenticated;

drop trigger if exists bnc_jobs_block_duplicate on public.bnc_jobs;
create trigger bnc_jobs_block_duplicate before insert on public.bnc_jobs
 for each row execute function bnc_private.block_duplicate_job();
commit;
