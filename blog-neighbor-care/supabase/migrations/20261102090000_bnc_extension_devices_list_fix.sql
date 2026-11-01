-- The record variable d and the table alias d shared a name, so listing devices failed with 42702 and no member could grant extension actions.
-- Only the list query's alias changes; grant and revoke behave as before.
create or replace function public.bnc_extension_permission_dispatch(p_user_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$ declare d public.bnc_reader_devices; begin
 if p_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_INVALID_INPUT';end if;
 if p_operation='list' and p_payload='{}'::jsonb then
  return (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from(select rd.id,rd.blog_id,rd.expires_at,p.kinds,p.reads,p.revoked_at,p.expires_at as permission_expires_at
   from public.bnc_reader_devices rd left join public.bnc_extension_permissions p on p.device_id=rd.id and p.user_id=p_user_id
   where rd.user_id=p_user_id and rd.revoked_at is null and rd.expires_at>clock_timestamp() order by rd.created_at desc limit 50)t);
 end if;
 if p_operation not in ('grant','revoke') or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('device_id','confirmed','kinds','reads')) then raise exception 'BNC_INVALID_INPUT';end if;
 select * into d from public.bnc_reader_devices where id=(p_payload->>'device_id')::uuid and user_id=p_user_id and revoked_at is null and expires_at>clock_timestamp() for update;
 if not found then raise exception 'BNC_NOT_FOUND';end if;
 if p_operation='revoke' then update public.bnc_extension_permissions set revoked_at=clock_timestamp() where device_id=d.id and user_id=p_user_id;return jsonb_build_object('revoked',true);end if;
 if p_payload->'confirmed' is distinct from 'true'::jsonb or jsonb_typeof(p_payload->'kinds') is distinct from 'array' or jsonb_typeof(coalesce(p_payload->'reads','[]'::jsonb)) is distinct from 'array' then raise exception 'BNC_INVALID_INPUT';end if;
 insert into public.bnc_extension_permissions(device_id,user_id,kinds,reads,expires_at)
 values(d.id,p_user_id,array(select jsonb_array_elements_text(p_payload->'kinds')),array(select jsonb_array_elements_text(coalesce(p_payload->'reads','[]'::jsonb))),d.expires_at)
 on conflict(device_id) do update set kinds=excluded.kinds,reads=excluded.reads,consented_at=clock_timestamp(),expires_at=excluded.expires_at,revoked_at=null;
 return jsonb_build_object('authorized',true,'executionSettingsChanged',false);
end $$;
revoke all on function public.bnc_extension_permission_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_extension_permission_dispatch(uuid,text,jsonb) to service_role;
