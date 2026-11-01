import 'server-only';
import {createAdminClient} from '../supabase/admin';
import type {ObjectValue} from '../analysis/contracts';
// Shared member-integration provider: one registration is reused by every program. Never another member's or the operator's key.
const PROVIDER='cronjob_org_api_key';
const names={monitor:'bnc_monitor_dispatch',post:'bnc_post_dispatch',message:'bnc_message_dispatch',analysis:'bnc_analysis_dispatch',scheduler:'bnc_monitor_scheduler_dispatch'} as const;
export async function monitorRpc(user:string|null,namespace:keyof typeof names,op:string,payload:ObjectValue){
 const {data,error}=await createAdminClient().rpc(names[namespace],{p_user_id:user,p_operation:op,p_payload:payload,...(namespace==='post'?{p_device_id:null}:{})});
 return {data,error};
}
export async function getCronKey(user:string){
 const {data}=await createAdminClient().from('user_api_keys').select('api_key').eq('user_id',user).eq('provider',PROVIDER).maybeSingle();
 return (data?.api_key as string|undefined)?.trim()||null;
}
export async function saveCronKey(user:string,key:string){
 const admin=createAdminClient(),now=new Date().toISOString();
 const {data:existing}=await admin.from('user_api_keys').select('id').eq('user_id',user).eq('provider',PROVIDER).maybeSingle();
 const {error}=existing?await admin.from('user_api_keys').update({api_key:key,updated_at:now}).eq('id',existing.id).eq('user_id',user):await admin.from('user_api_keys').insert({user_id:user,provider:PROVIDER,api_key:key,created_at:now,updated_at:now});
 if(error)throw Error('store');
}
export async function deleteCronKey(user:string){
 const {error}=await createAdminClient().from('user_api_keys').delete().eq('user_id',user).eq('provider',PROVIDER);if(error)throw Error('store');
}
